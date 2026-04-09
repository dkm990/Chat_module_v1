import type { CSSProperties } from "react";

type AppGuestShellProps = {
  googleReady: boolean;
  onGoogleLogin: () => void;
  onGoWelcome: () => void;
  notice?: string;
  telegramContainerId?: string;
  telegramWrapperStyle?: CSSProperties;
};

export function AppGuestShell({
  googleReady,
  onGoogleLogin,
  onGoWelcome,
  notice,
  telegramContainerId,
  telegramWrapperStyle,
}: AppGuestShellProps) {
  return (
    <div
      className="welcome-page-root"
      style={{
        background:
          "radial-gradient(circle at 15% 20%, rgba(132,85,239,0.18), transparent 38%), radial-gradient(circle at 85% 70%, rgba(186,158,255,0.14), transparent 42%), #0c0e12",
        color: "#f6f6fc",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <div
        className="welcome-page-card"
        style={{
          padding: 28,
          borderRadius: 22,
          background: "linear-gradient(180deg, rgba(35,38,44,0.58) 0%, rgba(23,26,31,0.46) 100%)",
          border: "1px solid rgba(255,255,255,0.16)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 30px 80px rgba(6,14,32,0.48), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 22px)", fontWeight: 800, letterSpacing: -0.4 }}>Sign in to use chat</h1>
        <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.5, opacity: 0.82 }}>
          You need an account to open conversations, send messages, and get realtime updates.
        </p>
        <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
          {telegramContainerId ? (
            <div style={telegramWrapperStyle}>
              <div id={telegramContainerId} style={{ width: "100%", display: "flex", justifyContent: "center" }} />
            </div>
          ) : null}
          <button
            type="button"
            onClick={onGoogleLogin}
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
              cursor: googleReady ? "pointer" : "not-allowed",
              opacity: googleReady ? 1 : 0.85,
              touchAction: "manipulation",
            }}
          >
            {googleReady ? "Sign in with Google" : "Google is loading…"}
          </button>
          <button
            type="button"
            onClick={onGoWelcome}
            style={{
              width: "100%",
              minHeight: 48,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            Go to welcome screen
          </button>
        </div>
        {notice ? <div style={{ marginTop: 14, fontSize: 12, color: "#ff9ea9" }}>{notice}</div> : null}
      </div>
    </div>
  );
}
