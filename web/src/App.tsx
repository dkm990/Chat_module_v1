import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { InviteUser, Me, Message, Room, UserSearchItem } from "./chatTypes";
import { AuthInvitePanel } from "./components/AuthInvitePanel";
import { AppLayout } from "./components/AppLayout";
import { AppGuestShell } from "./components/AppGuestShell";
import { Sidebar } from "./components/Sidebar";
import { ChatListPanel } from "./components/ChatListPanel";
import { ChatCanvas } from "./components/ChatCanvas";
import { ChatHeader } from "./components/ChatHeader";
import { SidebarDrawer } from "./components/SidebarDrawer";
import type { InviteViewMode } from "./components/InviteStateView";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useVisualViewportBottomInset } from "./hooks/useVisualViewportBottomInset";

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserSearchItem[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadBoundaryMessageId, setUnreadBoundaryMessageId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [inviteTarget, setInviteTarget] = useState<InviteUser | null>(null);
  const [inviteInvalid, setInviteInvalid] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const googleInitializedRef = useRef(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const typingStartedRef = useRef(false);
  const typingStopTimeoutRef = useRef<number | null>(null);
  const typingIndicatorTimeoutRef = useRef<number | null>(null);
  const lastTypingStartSentAtRef = useRef(0);
  const prevRoomIdRef = useRef<string | null>(null);
  const inviteHandledRef = useRef(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const isMobileAppLayout = useMediaQuery("(max-width: 768px)");
  const keyboardBottomInset = useVisualViewportBottomInset(isMobileAppLayout && !!roomId.trim());
  const isAuthed = !!token;
  const isWelcomeRoute = pathname === "/welcome";
  const isInviteRoute = /^\/(?:u|invite)\/[0-9a-fA-F-]{36}$/.test(pathname);
  const isAppRoute = pathname === "/app" || (!isWelcomeRoute && !isInviteRoute);
  const WELCOME_TELEGRAM_CONTAINER_ID = "telegram-login-container-welcome";
  const INVITE_TELEGRAM_CONTAINER_ID = "telegram-login-container-invite";
  const SIDEBAR_TELEGRAM_CONTAINER_ID = "telegram-login-container-sidebar";
  const APP_GUEST_TELEGRAM_CONTAINER_ID = "telegram-login-container-app-guest";
  const active = rooms.find((r) => r.id === roomId);
  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (roomId) setMobileDrawerOpen(false);
  }, [roomId]);

  function navigate(path: string) {
    if (window.location.pathname === path) return;
    window.history.pushState({}, "", path);
    setPathname(path);
  }

  const activeCounterpartUserId = active?.counterpartUserId || null;

  function activeRoom(): Room | undefined {
    return rooms.find((r) => r.id === roomId);
  }

  function roomTsValue(room: Room): number {
    return room.lastMessageTimestamp ? new Date(room.lastMessageTimestamp).getTime() : 0;
  }

  function moveRoomToTop(updated: Room) {
    setRooms((prev) => {
      const next = [updated, ...prev.filter((r) => r.id !== updated.id)];
      return next.sort((a, b) => roomTsValue(b) - roomTsValue(a));
    });
  }

  function parseMessagePreview(msg: Message): string {
    if (msg.type === "IMAGE") return "Photo";
    if (msg.type === "VIDEO") return "Video";
    if (msg.type === "LOCATION") return "Location";
    if (msg.type === "SYSTEM") return "System update";
    try {
      const body = JSON.parse(msg.bodyJson);
      return String(body?.text || "").trim() || "Message";
    } catch {
      return (msg.bodyJson || "").trim() || "Message";
    }
  }

  function updateRoomFromMessage(msg: Message) {
    setIsPeerTyping(false);
    if (typingIndicatorTimeoutRef.current) {
      window.clearTimeout(typingIndicatorTimeoutRef.current);
      typingIndicatorTimeoutRef.current = null;
    }
    setRooms((prev) => {
      const existing = prev.find((r) => r.id === msg.chatId);
      if (!existing) return prev;
      const updated: Room = {
        ...existing,
        lastMessagePreview: parseMessagePreview(msg),
        lastMessageTimestamp: msg.createdAt,
        unreadCount: existing.id === roomId ? 0 : (existing.unreadCount || 0) + 1,
      };
      const next = [updated, ...prev.filter((r) => r.id !== msg.chatId)];
      return next.sort((a, b) => roomTsValue(b) - roomTsValue(a));
    });
  }

  const stomp = useMemo(() => {
    if (!token) return null;
    return new Client({
      webSocketFactory: () => new SockJS(`${API}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        if (roomId) {
          clientSubscribe(roomId);
        }
      },
    });
    function clientSubscribe(targetRoomId: string) {}
  }, [token, roomId]);

  useEffect(() => {
    if (!stomp) return;
    stomp.onConnect = () => {
      if (userId) {
        stomp.subscribe(`/topic/user.${userId}.rooms.updated`, () => {
          loadRooms();
        });
      }
      if (activeCounterpartUserId) {
        stomp.subscribe(`/topic/user.${activeCounterpartUserId}.presence.changed`, (frame) => {
          const payload = JSON.parse(frame.body || "{}");
          setRooms((prev) => prev.map((r) => {
            if (r.counterpartUserId !== activeCounterpartUserId) return r;
            return {
              ...r,
              counterpartOnline: payload.status === "online",
              counterpartLastSeen: payload.lastSeen || r.counterpartLastSeen || null,
            };
          }));
        });
      }
      if (roomId) {
        stomp.subscribe(`/topic/rooms.${roomId}.typing`, (frame) => {
          const payload = JSON.parse(frame.body || "{}");
          if (!payload?.userId || payload.userId === userId) return;
          if (payload.state === "start") {
            setIsPeerTyping(true);
            if (typingIndicatorTimeoutRef.current) window.clearTimeout(typingIndicatorTimeoutRef.current);
            typingIndicatorTimeoutRef.current = window.setTimeout(() => {
              setIsPeerTyping(false);
              typingIndicatorTimeoutRef.current = null;
            }, 3000);
          } else if (payload.state === "stop") {
            setIsPeerTyping(false);
            if (typingIndicatorTimeoutRef.current) {
              window.clearTimeout(typingIndicatorTimeoutRef.current);
              typingIndicatorTimeoutRef.current = null;
            }
          }
        });
        stomp.subscribe(`/topic/rooms.${roomId}.messages.created`, (frame) => {
          const msg = JSON.parse(frame.body);
          const shouldStick = isNearBottom();
          setMessages((prev) => [...prev, msg]);
          updateRoomFromMessage(msg);
          requestAnimationFrame(() => {
            if (shouldStick) scrollMessagesToBottom();
          });
        });
      }
    };
    stomp.activate();
    return () => {
      if (typingStopTimeoutRef.current) {
        window.clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      if (typingIndicatorTimeoutRef.current) {
        window.clearTimeout(typingIndicatorTimeoutRef.current);
        typingIndicatorTimeoutRef.current = null;
      }
      stomp.deactivate();
    };
  }, [stomp, roomId, userId, activeCounterpartUserId]);

  function publishTyping(state: "start" | "stop", targetRoomId?: string) {
    const rid = targetRoomId || roomId;
    if (!rid || !stomp || !stomp.connected) return;
    stomp.publish({
      destination: "/app/chat.typing",
      body: JSON.stringify({ roomId: rid, state }),
    });
  }

  function scheduleTypingStop(targetRoomId?: string) {
    if (typingStopTimeoutRef.current) window.clearTimeout(typingStopTimeoutRef.current);
    typingStopTimeoutRef.current = window.setTimeout(() => {
      if (typingStartedRef.current) {
        publishTyping("stop", targetRoomId);
        typingStartedRef.current = false;
      }
      typingStopTimeoutRef.current = null;
    }, 1500);
  }

  function handleComposerChange(nextText: string) {
    setText(nextText);
    if (!roomId) return;
    const hasText = nextText.trim().length > 0;
    if (!hasText) {
      if (typingStopTimeoutRef.current) {
        window.clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      if (typingStartedRef.current) {
        publishTyping("stop");
        typingStartedRef.current = false;
      }
      return;
    }
    const now = Date.now();
    if (!typingStartedRef.current || now - lastTypingStartSentAtRef.current >= 1000) {
      publishTyping("start");
      typingStartedRef.current = true;
      lastTypingStartSentAtRef.current = now;
    }
    scheduleTypingStop();
  }

  useEffect(() => {
    const prev = prevRoomIdRef.current;
    if (prev && prev !== roomId && typingStartedRef.current) {
      publishTyping("stop", prev);
      typingStartedRef.current = false;
    }
    prevRoomIdRef.current = roomId || null;
    setIsPeerTyping(false);
  }, [roomId]);

  function clearAuthState(message?: string) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userId");
    setToken("");
    setUserId("");
    setMe(null);
    setRooms([]);
    setRoomId("");
    setMessages([]);
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

  function shareInviteLink(forUserId?: string) {
    const id = forUserId || me?.userId || userId;
    if (!id) return "";
    return `${INVITE_BASE_URL}/invite/${id}`;
  }

  async function copyInviteLink() {
    const currentUserId = me?.userId || userId;
    const link = shareInviteLink(currentUserId);
    if (!link) return;
    console.log("[invite.link.copy]", { currentUserId, inviteUrl: link });
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Invite link copied.");
    } catch {
      setNotice(link);
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
    await loadRooms();
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
            await loadRooms();
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
          : SIDEBAR_TELEGRAM_CONTAINER_ID;
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

  async function loadRooms() {
    setRoomsLoading(true);
    const res = await apiFetch("/api/chat/v1/rooms");
    if (!res.ok) {
      if (res.status !== 401 && res.status !== 403) setNotice("Failed to load rooms.");
      setRoomsLoading(false);
      return;
    }
    const incoming = Array.isArray(res.data) ? res.data : [];
    setRooms((prev) => {
      const unreadById = new Map(prev.map((r) => [r.id, r.unreadCount || 0]));
      return incoming.map((r: Room) => {
        if (r.id === roomId) {
          return { ...r, unreadCount: 0 };
        }
        if ((r.unreadCount || 0) === 0 && unreadById.has(r.id)) {
          return { ...r, unreadCount: unreadById.get(r.id) || 0 };
        }
        return r;
      });
    });
    if (!roomId && incoming.length > 0) {
      const firstRoomId = incoming[0].id;
      setRoomId(firstRoomId);
      await loadMessages(firstRoomId);
    }
    setRoomsLoading(false);
    setNotice("");
  }

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
    if (!token || !inviteTargetId) return;
    apiFetch(`/api/chat/v1/users/${inviteTargetId}/public`).then((res) => {
      if (!res.ok) {
        if (res.status === 404) setInviteInvalid(true);
        return;
      }
      setInviteInvalid(false);
      setInviteTarget(res.data as InviteUser);
    });
  }, [token, inviteTargetId]);

  useEffect(() => {
    if (!inviteTargetId) {
      setInviteTarget(null);
      setInviteInvalid(false);
      inviteHandledRef.current = false;
    }
  }, [inviteTargetId]);

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }
    loadMe();
    loadRooms();
  }, [token]);

  function clearUserSearchResults() {
    setUserResults([]);
  }

  async function searchUsers(overrideQuery?: string) {
    const q = (overrideQuery !== undefined ? overrideQuery : userQuery).trim();
    if (!q) {
      setUserResults([]);
      setSearchingUsers(false);
      return;
    }
    setSearchingUsers(true);
    const res = await apiFetch(`/api/chat/v1/users/search?q=${encodeURIComponent(q)}&limit=10`);
    setSearchingUsers(false);
    if (!res.ok) {
      if (res.status !== 401 && res.status !== 403) setNotice("Failed to search users.");
      return;
    }
    setUserResults(Array.isArray(res.data) ? res.data : []);
    setNotice("");
  }

  async function createRoomWithTarget(
    targetId: string,
    options?: { open?: boolean; refresh?: boolean; silent?: boolean },
  ): Promise<Room | null> {
    const open = options?.open ?? true;
    const refresh = options?.refresh ?? true;
    const silent = options?.silent ?? false;
    const res = await apiFetch("/api/chat/v1/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DIRECT", title: "Direct chat", targetUserId: targetId }),
    });
    // Temporary diagnostics for invite/create direct failures.
    console.log("[invite.createRoomWithTarget]", {
      endpoint: "/api/chat/v1/rooms",
      method: "POST",
      targetUserId: targetId,
      hasAuthToken: !!token,
      responseStatus: res.status,
      responseOk: res.ok,
      responseBody: res.data,
    });
    if (!res.ok || !res.data?.id) {
      if (!silent && res.status !== 401 && res.status !== 403) setNotice("Failed to create direct room.");
      return null;
    }
    const room = res.data;
    if (open) {
      setRoomId(room.id);
      await loadMessages(room.id);
    }
    setUserResults([]);
    setUserQuery("");
    moveRoomToTop({ ...room, unreadCount: 0 });
    if (refresh) await loadRooms();
    if (!silent) setNotice("");
    return room;
  }

  useEffect(() => {
    if (!inviteTargetId || !token || !me) return;
    if (inviteHandledRef.current) return;
    if (me.userId === inviteTargetId) {
      setNotice("This is your profile link.");
      inviteHandledRef.current = true;
      return;
    }
    inviteHandledRef.current = true;
    (async () => {
      const room = await createRoomWithTarget(inviteTargetId, { open: true, refresh: true, silent: true });
      if (!room) {
        inviteHandledRef.current = false;
        setNotice("Failed to open invite chat. Please try again.");
        return;
      }
      setNotice("");
      navigate("/app");
    })().catch(() => {
      inviteHandledRef.current = false;
      setNotice("Failed to open invite chat. Please try again.");
    });
  }, [inviteTargetId, token, me]);

  useEffect(() => {
    if (isInviteRoute && roomId) {
      navigate("/app");
    }
  }, [isInviteRoute, roomId]);

  async function loadMessages(targetRoomId: string) {
    setMessagesLoading(true);
    const res = await apiFetch(`/api/chat/v1/rooms/${targetRoomId}/messages?limit=50`);
    if (!res.ok) {
      if (res.status !== 401 && res.status !== 403) setNotice("Failed to load messages.");
      setMessagesLoading(false);
      return;
    }
    const data = res.data || {};
    const items = Array.isArray(data.items) ? [...data.items].reverse() : [];
    const roomUnread = rooms.find((r) => r.id === targetRoomId)?.unreadCount || 0;
    if (roomUnread > 0 && roomUnread < items.length) {
      setUnreadBoundaryMessageId(items[Math.max(0, items.length - roomUnread)]?.id || null);
    } else {
      setUnreadBoundaryMessageId(null);
    }
    setMessages(items);
    setRooms((prev) => prev.map((r) => (r.id === targetRoomId ? { ...r, unreadCount: 0 } : r)));
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollMessagesToBottom());
    setMessagesLoading(false);
    setNotice("");
  }

  async function sendRest() {
    if (!roomId || !text.trim()) return;
    const res = await apiFetch(`/api/chat/v1/rooms/${roomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "TEXT", text }),
    });
    if (!res.ok) {
      if (res.status !== 401 && res.status !== 403) setNotice("Failed to send message.");
      return;
    }
    setText("");
    if (typingStopTimeoutRef.current) {
      window.clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    if (typingStartedRef.current) {
      publishTyping("stop");
      typingStartedRef.current = false;
    }
    moveRoomToTop({
      ...(rooms.find((r) => r.id === roomId) || { id: roomId, type: "DIRECT" }),
      lastMessagePreview: text.trim(),
      lastMessageTimestamp: new Date().toISOString(),
      unreadCount: 0,
    });
    await loadMessages(roomId);
  }

  function onComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    const native = event.nativeEvent as KeyboardEvent & { isComposing?: boolean };
    if (native.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendRest();
    }
  }

  async function uploadAndSend(file: File) {
    if (!roomId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch(`${API}/api/chat/v1/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!uploadRes.ok) {
        if (uploadRes.status === 401 || uploadRes.status === 403) {
          clearAuthState("Session expired or unauthorized. Please sign in again.");
          return;
        }
        throw new Error("Upload failed");
      }
      const uploaded = await uploadRes.json();
      const isVideo = String(uploaded.mimeType || "").startsWith("video/");
      const sendRes = await apiFetch(`/api/chat/v1/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: isVideo ? "VIDEO" : "IMAGE",
          text: "",
          attachments: [
            {
              kind: isVideo ? "VIDEO" : "IMAGE",
              storageKey: uploaded.storageKey,
              publicUrl: uploaded.publicUrl,
              mimeType: uploaded.mimeType,
              sizeBytes: uploaded.sizeBytes,
              width: uploaded.width,
              height: uploaded.height,
              durationSec: uploaded.durationSec,
            },
          ],
        }),
      });
      if (!sendRes.ok) {
        if (sendRes.status !== 401 && sendRes.status !== 403) setNotice("Failed to send media message.");
        return;
      }
      moveRoomToTop({
        ...(rooms.find((r) => r.id === roomId) || { id: roomId, type: "DIRECT" }),
        lastMessagePreview: isVideo ? "Video" : "Photo",
        lastMessageTimestamp: new Date().toISOString(),
        unreadCount: 0,
      });
      await loadMessages(roomId);
    } finally {
      setUploading(false);
    }
  }

  async function sendLocation() {
    if (!roomId) return;
    if (!navigator.geolocation) {
      setNotice("Geolocation is not supported.");
      return;
    }
    const coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      );
    });
    if (!coords) {
      setNotice("Failed to get location.");
      return;
    }
    const res = await apiFetch(`/api/chat/v1/rooms/${roomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "LOCATION",
        location: { lat: coords.lat, lng: coords.lng, label: null },
      }),
    });
    if (!res.ok) {
      if (res.status !== 401 && res.status !== 403) setNotice("Failed to send location message.");
      return;
    }
    moveRoomToTop({
      ...(rooms.find((r) => r.id === roomId) || { id: roomId, type: "DIRECT" }),
      lastMessagePreview: "Location",
      lastMessageTimestamp: new Date().toISOString(),
      unreadCount: 0,
    });
    await loadMessages(roomId);
  }

  function parseBody(bodyJson: string) {
    try {
      return JSON.parse(bodyJson);
    } catch {
      return { text: bodyJson };
    }
  }

  function scrollMessagesToBottom() {
    const list = messageListRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }

  function isNearBottom() {
    const list = messageListRef.current;
    if (!list) return true;
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight;
    return distance < 48;
  }

  function onMessagesScroll() {
    stickToBottomRef.current = isNearBottom();
  }

  function handleComposerFocusScroll() {
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollMessagesToBottom());
    window.setTimeout(() => scrollMessagesToBottom(), 280);
  }

  function relativeLastSeen(ts?: string | null) {
    if (!ts) return "offline";
    const deltaSec = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
    if (deltaSec < 60) return "last seen just now";
    const min = Math.floor(deltaSec / 60);
    if (min < 60) return `last seen ${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `last seen ${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `last seen ${day}d ago`;
  }

  let inviteMode: InviteViewMode | null = null;
  if (inviteTargetId) {
    if (!token) inviteMode = "normal";
    else if (inviteInvalid) inviteMode = "invalid";
    else if (!inviteTarget) inviteMode = "loading";
    else if (me?.userId && me.userId === inviteTargetId) inviteMode = "self";
    else inviteMode = "normal";
  }

  const presenceText = activeRoom()?.counterpartOnline ? "online" : relativeLastSeen(activeRoom()?.counterpartLastSeen);
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

  if (isInviteRoute) {
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
            onCopyInviteLink={copyInviteLink}
            ownInviteLink={shareInviteLink(me?.userId || userId)}
            onGoogleLogin={googlePopupLogin}
            telegramContainerId={INVITE_TELEGRAM_CONTAINER_ID}
            isAuthed={isAuthed}
            onLoadRooms={loadRooms}
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

  const sidebarNode = <Sidebar displayName={me?.displayName} userId={me?.userId || userId} isAuthed={isAuthed} />;

  const chatListNode = (
    <ChatListPanel
      isAuthed={isAuthed}
      inviteLink={isAuthed ? shareInviteLink() : ""}
      loading={roomsLoading}
      errorMessage={notice}
      rooms={rooms}
      roomId={roomId}
      onOpenRoom={(id) => {
        setRoomId(id);
        loadMessages(id);
      }}
      userQuery={userQuery}
      setUserQuery={setUserQuery}
      searchUsers={searchUsers}
      clearUserSearchResults={clearUserSearchResults}
      searchingUsers={searchingUsers}
      userResults={userResults}
      createRoomWithTarget={async (id) => {
        await createRoomWithTarget(id);
      }}
      suppressTitle={isMobileAppLayout}
      isMobileLayout={isMobileAppLayout}
    />
  );

  const chatCanvasNode = (
    <ChatCanvas
      apiBase={API}
      currentUserId={me?.userId || userId}
      roomId={roomId}
      activeRoom={activeRoom()}
      isPeerTyping={isPeerTyping}
      presenceText={presenceText}
      messages={messages}
      loading={messagesLoading}
      errorMessage={notice}
      unreadBoundaryMessageId={unreadBoundaryMessageId}
      parseBody={parseBody}
      messageListRef={messageListRef}
      onMessagesScroll={onMessagesScroll}
      text={text}
      onTextChange={handleComposerChange}
      onComposerKeyDown={onComposerKeyDown}
      onSend={sendRest}
      disabled={!isAuthed || !roomId}
      uploading={uploading}
      onFilePick={uploadAndSend}
      onSendLocation={sendLocation}
      isMobileLayout={isMobileAppLayout}
      onBackToList={() => setRoomId("")}
      keyboardBottomInset={keyboardBottomInset}
      onComposerFocusScroll={handleComposerFocusScroll}
      stickToBottomRef={stickToBottomRef}
    />
  );

  if (isMobileAppLayout && isAuthed && isAppRoute) {
    const mobileShellBg =
      "radial-gradient(circle at 8% 8%, rgba(132,85,239,0.16), transparent 28%), radial-gradient(circle at 92% 18%, rgba(186,158,255,0.1), transparent 32%), #0c0e12";
    return (
      <>
        <div
          style={{
            height: "100%",
            minHeight: "100%",
            width: "100%",
            maxWidth: "100vw",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: mobileShellBg,
            color: "#f6f6fc",
            fontFamily: "Manrope, sans-serif",
          }}
        >
          {!roomId ? (
            <>
              <ChatHeader
                activeRoom={undefined}
                isPeerTyping={false}
                presenceText=""
                mobileSelectedRoomId=""
                onMobileOpenSidebar={() => setMobileDrawerOpen(true)}
              />
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>{chatListNode}</div>
            </>
          ) : (
            <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>{chatCanvasNode}</div>
          )}
        </div>
        <SidebarDrawer open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)}>
          {sidebarNode}
        </SidebarDrawer>
      </>
    );
  }

  return (
    <AppLayout sidebar={sidebarNode} chatList={chatListNode} chatCanvas={chatCanvasNode} />
  );
}
