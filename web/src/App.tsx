import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { InviteUser, Me } from "./chatTypes";
import { ChatLayout } from "./chat";
import { AuthInvitePanel } from "./components/AuthInvitePanel";
import { AppGuestShell } from "./components/AppGuestShell";
import type { InviteViewMode } from "./components/InviteStateView";

const isLocalBrowser =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API = (import.meta.env.VITE_API_BASE_URL || (isLocalBrowser ? "http://localhost:8092" : window.location.origin)).replace(/\/+$/, "");
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";
const INVITE_BASE_URL = (import.meta.env.VITE_INVITE_BASE_URL || window.location.origin).replace(/\/+$/, "");
const DEV_MODE = new URLSearchParams(window.location.search).get("dev") === "1";

declare global {
  interface Window {
    google?: any;
    onTelegramAuth?: (payload: Record<string, unknown>) => void;
  }
}

export function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const inviteTargetId = (() => {
    const m = pathname.match(/^\/(?:u|invite)\/([0-9a-fA-F-]{36})$/);
    return m ? m[1] : "";
  })();
  const [token, setToken] = useState(localStorage.getItem("accessToken") || "");
  const [userId, setUserId] = useState(localStorage.getItem("userId") || "");
  const [me, setMe] = useState<Me | null>(null);
  const [notice, setNotice] = useState("");
  const [inviteTarget, setInviteTarget] = useState<InviteUser | null>(null);
  const [inviteInvalid, setInviteInvalid] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleInitializedRef = useRef(false);
  const isAuthed = !!token;
  const isWelcomeRoute = pathname === "/welcome";
  const isInviteRoute = /^\/(?:u|invite)\/[0-9a-fA-F-]{36}$/.test(pathname);
  const isAppRoute = pathname === "/app" || (!isWelcomeRoute && !isInviteRoute);
  const WELCOME_TELEGRAM_CONTAINER_ID = "telegram-login-container-welcome";
  const INVITE_TELEGRAM_CONTAINER_ID = "telegram-login-container-invite";
  const APP_GUEST_TELEGRAM_CONTAINER_ID = "telegram-login-container-app-guest";
  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(path: string) {
    if (window.location.pathname === path) return;
    window.history.pushState({}, "", path);
    setPathname(path);
  }

  function clearAuthState(message?: string) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userId");
    setToken("");
    setUserId("");
    setMe(null);
    if (message) setNotice(message);
  }

  function setTokenFromDev(value: string) {
    setToken(value);
    try {
      setUserId(decodeSub(value));
    } catch {
      setUserId("");
    }
  }

  async function safeJson(res: Response): Promise<any> {
    const raw = await res.text();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function apiFetch(path: string, init?: RequestInit, authRequired = true): Promise<{ ok: boolean; status: number; data: any }> {
    const reqHeaders = new Headers(init?.headers || {});
    if (authRequired) {
      if (!token) return { ok: false, status: 401, data: null };
      reqHeaders.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(`${API}${path}`, { ...init, headers: reqHeaders });
    const data = await safeJson(res);
    if (authRequired && (res.status === 401 || res.status === 403)) {
      clearAuthState("Session expired or unauthorized. Please sign in again.");
    }
    return { ok: res.ok, status: res.status, data };
  }

  function decodeSub(jwt: string): string {
    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub;
  }

  async function exchangeGoogleToken(idToken: string) {
    const res = await fetch(`${API}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Google auth failed");
    const data = await res.json();
    const accessToken = data.accessToken as string;
    const sub = decodeSub(accessToken);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("userId", sub);
    setToken(accessToken);
    setUserId(sub);
    setNotice("");
    await loadMe(accessToken);
  }

  async function exchangeTelegramPayload(payload: Record<string, unknown>) {
    const res = await fetch(`${API}/api/auth/telegram/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Telegram auth failed");
    const data = await res.json();
    const accessToken = data.accessToken as string;
    const sub = decodeSub(accessToken);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("userId", sub);
    setToken(accessToken);
    setUserId(sub);
    setNotice("");
    await loadMe(accessToken);
  }

  function ensureGoogleInitialized(): boolean {
    if (!GOOGLE_CLIENT_ID) {
      setNotice("Google sign-in is not configured (missing client id).");
      setGoogleReady(false);
      return false;
    }
    if (!window.google) {
      setGoogleReady(false);
      return false;
    }
    setGoogleReady(true);
    if (!googleInitializedRef.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          try {
            await exchangeGoogleToken(response.credential);
          } catch (e) {
            setNotice("Google login failed. Please try again.");
          }
        },
      });
      googleInitializedRef.current = true;
    }
    return true;
  }

  useEffect(() => {
    ensureGoogleInitialized();
  }, [GOOGLE_CLIENT_ID]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (window.google) {
        setGoogleReady(true);
        window.clearInterval(id);
      }
    }, 300);
    return () => window.clearInterval(id);
  }, []);

  function googlePopupLogin() {
    if (!ensureGoogleInitialized()) {
      return;
    }
    window.google.accounts.id.prompt((notification: any) => {
      // User dismissed/closed chooser; keep flow reusable for next click.
      if (notification?.isDismissedMoment?.() || notification?.isSkippedMoment?.()) {
        return;
      }
    });
  }

  useEffect(() => {
    window.onTelegramAuth = async (payload: Record<string, unknown>) => {
      try {
        await exchangeTelegramPayload(payload);
      } catch {
        setNotice("Telegram login failed. Please try again.");
      }
    };
    return () => {
      window.onTelegramAuth = undefined;
    };
  }, []);

  useEffect(() => {
    if (!TELEGRAM_BOT_USERNAME) return;
    const appGuestTelegram = isAppRoute && !isAuthed && !isWelcomeRoute && !isInviteRoute;
    const activeContainerId = isWelcomeRoute
      ? WELCOME_TELEGRAM_CONTAINER_ID
      : isInviteRoute
        ? INVITE_TELEGRAM_CONTAINER_ID
        : appGuestTelegram
          ? APP_GUEST_TELEGRAM_CONTAINER_ID
          : "";
    if (!activeContainerId) return;
    const container = document.getElementById(activeContainerId);
    if (!container) return;
    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", TELEGRAM_BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);
  }, [TELEGRAM_BOT_USERNAME, pathname, isWelcomeRoute, isInviteRoute, isAppRoute, isAuthed]);

  async function loadMe(overrideToken?: string) {
    const authToken = overrideToken || token;
    if (!authToken) return;
    const res = await fetch(`${API}/api/chat/v1/me`, { headers: { Authorization: `Bearer ${authToken}` } });
    const data = await safeJson(res);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearAuthState("Session expired or unauthorized. Please sign in again.");
      }
      return;
    }
    setMe(data);
  }

  useEffect(() => {
    if (isAuthed || !inviteTargetId) return;
    apiFetch(`/api/chat/v1/users/${inviteTargetId}/public`).then((res) => {
      if (!res.ok) {
        if (res.status === 404) setInviteInvalid(true);
        return;
      }
      setInviteInvalid(false);
      setInviteTarget(res.data as InviteUser);
    });
  }, [isAuthed, inviteTargetId]);

  useEffect(() => {
    if (!inviteTargetId) {
      setInviteTarget(null);
      setInviteInvalid(false);
    }
  }, [inviteTargetId]);

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }
    loadMe();
  }, [token]);

  let inviteMode: InviteViewMode | null = null;
  if (inviteTargetId) {
    if (!token) inviteMode = "normal";
    else if (inviteInvalid) inviteMode = "invalid";
    else if (!inviteTarget) inviteMode = "loading";
    else if (me?.userId && me.userId === inviteTargetId) inviteMode = "self";
    else inviteMode = "normal";
  }

  const inviteTargetNameTrimmed = inviteTarget?.displayName?.trim();
  const inviteHeadline = inviteTargetNameTrimmed
    ? `${inviteTargetNameTrimmed} invited you to start a conversation`
    : "Someone invited you to start a conversation";
  const spacing = { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 };
  const heroTitleStyle: CSSProperties = { margin: 0, fontSize: 56, lineHeight: 1.05, fontWeight: 800, letterSpacing: -1.2 };
  const subtitleStyle: CSSProperties = { fontSize: 18, lineHeight: 1.45, opacity: 0.82 };
  const telegramWrapperStyle: CSSProperties = {
    width: "100%",
    maxWidth: 360,
    marginInline: "auto",
    minHeight: 52,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 8px 18px rgba(6,14,32,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: "6px 0",
  };

  if (isWelcomeRoute) {
    return (
      <div
        className="welcome-page-root"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, rgba(132,85,239,0.18), transparent 38%), radial-gradient(circle at 85% 70%, rgba(186,158,255,0.14), transparent 42%), #0c0e12",
          color: "#f6f6fc",
          fontFamily: "Manrope, sans-serif",
          position: "relative",
        }}
      >
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, left: -120, width: 420, height: 420, borderRadius: "9999px", background: "rgba(132,85,239,0.22)", filter: "blur(90px)" }} />
          <div style={{ position: "absolute", bottom: -90, right: -80, width: 360, height: 360, borderRadius: "9999px", background: "rgba(94,44,145,0.22)", filter: "blur(90px)" }} />
        </div>
        <div
          className="welcome-page-card"
          style={{
            padding: spacing.xl,
            borderRadius: 28,
            background: "linear-gradient(180deg, rgba(35,38,44,0.58) 0%, rgba(23,26,31,0.46) 100%)",
            border: "1px solid rgba(255,255,255,0.16)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 30px 80px rgba(6,14,32,0.48), inset 0 1px 0 rgba(255,255,255,0.08)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <h1 style={{ ...heroTitleStyle, fontSize: "clamp(32px, 9vw, 56px)" }}>Connect. <span style={{ color: "#ba9eff" }}>Plan.</span> Celebrate.</h1>
          <p style={{ ...subtitleStyle, marginTop: spacing.sm, fontSize: "clamp(15px, 4vw, 18px)" }}>Sign in to continue to chat.</p>
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.lg }}>
            <div style={telegramWrapperStyle}>
              <div id={WELCOME_TELEGRAM_CONTAINER_ID} style={{ width: "100%", display: "flex", justifyContent: "center" }} />
            </div>
            <button
              type="button"
              onClick={googlePopupLogin}
              disabled={!googleReady}
              style={{
                width: "100%",
                minHeight: 48,
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.94)",
                color: "#111",
                fontWeight: 700,
                fontSize: 16,
                opacity: googleReady ? 1 : 0.85,
                cursor: googleReady ? "pointer" : "not-allowed",
                touchAction: "manipulation",
              }}
            >
              {googleReady ? "Sign in with Google" : "⏳ Google is loading..."}
            </button>
            {isAuthed ? (
              <button
                type="button"
                onClick={() => navigate("/app")}
                style={{
                  width: "100%",
                  minHeight: 48,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(186,158,255,0.22)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  touchAction: "manipulation",
                }}
              >
                Continue to app
              </button>
            ) : null}
            {notice ? <div style={{ marginTop: 8, fontSize: 12, color: "#ff9ea9" }}>{notice}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  if (isInviteRoute && !isAuthed) {
    return (
      <div
        className="invite-page-root"
        style={{
          background:
            "radial-gradient(circle at 20% 15%, rgba(129,140,248,0.16), transparent 35%), radial-gradient(circle at 80% 75%, rgba(114,117,145,0.14), transparent 40%), #0b1326",
          color: "#dae2fd",
          fontFamily: "Manrope, sans-serif",
          position: "relative",
        }}
      >
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -70, right: -70, width: 320, height: 320, borderRadius: "9999px", background: "rgba(129,140,248,0.22)", filter: "blur(90px)" }} />
          <div style={{ position: "absolute", bottom: -80, left: -120, width: 420, height: 420, borderRadius: "9999px", background: "rgba(45,52,73,0.35)", filter: "blur(110px)" }} />
        </div>
        <div
          className="invite-page-card"
          style={{
            padding: spacing.xl,
            borderRadius: 28,
            background: "linear-gradient(180deg, rgba(45,52,73,0.42) 0%, rgba(23,31,51,0.38) 100%)",
            border: "1px solid rgba(198,197,213,0.18)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 30px 80px rgba(6,14,32,0.48), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(129,140,248,0.08)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 6vw, 34px)", lineHeight: 1.2, fontWeight: 800, letterSpacing: -0.5 }}>
            {inviteHeadline}
          </h1>
          <p style={{ ...subtitleStyle, marginTop: spacing.sm, marginBottom: spacing.md, fontSize: "clamp(15px, 4vw, 18px)" }}>
            Sign in and the chat opens automatically.
          </p>
          <AuthInvitePanel
            me={me}
            userId={userId}
            inviteTargetId={inviteTargetId}
            inviteTargetName={inviteTarget?.displayName}
            inviteMode={inviteMode}
            notice={notice}
            devMode={DEV_MODE}
            token={token}
            setTokenFromDev={setTokenFromDev}
            onCopyInviteLink={() => undefined}
            ownInviteLink=""
            onGoogleLogin={googlePopupLogin}
            telegramContainerId={INVITE_TELEGRAM_CONTAINER_ID}
            isAuthed={isAuthed}
            onLoadRooms={() => undefined}
            showLoadRooms={false}
            inviteOnly={true}
            googleReady={googleReady}
          />
        </div>
      </div>
    );
  }

  if (isAppRoute && !isAuthed) {
    return (
      <AppGuestShell
        googleReady={googleReady}
        onGoogleLogin={googlePopupLogin}
        onGoWelcome={() => navigate("/welcome")}
        notice={notice}
        telegramContainerId={TELEGRAM_BOT_USERNAME ? APP_GUEST_TELEGRAM_CONTAINER_ID : undefined}
        telegramWrapperStyle={telegramWrapperStyle}
      />
    );
  }

  return (
    <ChatLayout
      apiBase={API}
      token={token}
      me={me}
      userId={userId}
      isAuthed={isAuthed}
      inviteBaseUrl={INVITE_BASE_URL}
      initialInviteTargetId={isInviteRoute ? inviteTargetId : undefined}
      onInviteHandled={() => {
        if (isInviteRoute) navigate("/app");
      }}
    />
  );
}
