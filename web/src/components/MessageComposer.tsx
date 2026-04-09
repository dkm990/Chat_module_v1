import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRef, useState } from "react";

type MessageComposerProps = {
  text: string;
  onTextChange: (next: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  disabled: boolean;
  uploading: boolean;
  onFilePick: (file: File) => void;
  onSendLocation: () => void;
  isMobileLayout?: boolean;
  onTextAreaFocus?: () => void;
};

const MOBILE_HIT = 44;

export function MessageComposer(props: MessageComposerProps) {
  const {
    text,
    onTextChange,
    onKeyDown,
    onSend,
    disabled,
    uploading,
    onFilePick,
    onSendLocation,
    isMobileLayout,
    onTextAreaFocus,
  } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const footerPad = isMobileLayout
    ? `12px max(14px, env(safe-area-inset-right, 0px)) max(12px, env(safe-area-inset-bottom, 0px)) max(14px, env(safe-area-inset-left, 0px))`
    : "14px";

  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: footerPad,
        background: "rgba(23,26,31,0.68)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", gap: isMobileLayout ? 8 : 10, alignItems: "flex-end", position: "relative" }}>
        <button
          disabled={disabled}
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            width: MOBILE_HIT,
            height: MOBILE_HIT,
            minWidth: MOBILE_HIT,
            minHeight: MOBILE_HIT,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#d2ccff",
            fontSize: 24,
            lineHeight: "20px",
            fontWeight: 500,
            flexShrink: 0,
            opacity: disabled ? 0.5 : 1,
            boxSizing: "border-box",
            touchAction: "manipulation",
          }}
          aria-label="Attach"
        >
          +
        </button>
        {menuOpen ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: MOBILE_HIT + 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(20,22,29,0.96)",
              borderRadius: 10,
              padding: 6,
              display: "grid",
              gap: 4,
              minWidth: 150,
              zIndex: 5,
            }}
          >
            <button
              disabled={disabled}
              onClick={() => {
                fileInputRef.current?.click();
                setMenuOpen(false);
              }}
              style={menuItemStyle}
            >
              Attach image
            </button>
            <button
              disabled={disabled}
              onClick={() => {
                onSendLocation();
                setMenuOpen(false);
              }}
              style={menuItemStyle}
            >
              Send location
            </button>
          </div>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/quicktime"
          style={{ display: "none" }}
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFilePick(f);
            e.currentTarget.value = "";
          }}
        />
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            onTextAreaFocus?.();
            window.setTimeout(() => onTextAreaFocus?.(), 120);
          }}
          rows={isMobileLayout ? 1 : 2}
          enterKeyHint="send"
          inputMode="text"
          autoComplete="off"
          autoCorrect="on"
          style={{
            flex: 1,
            resize: "none",
            minHeight: isMobileLayout ? MOBILE_HIT : 52,
            maxHeight: isMobileLayout ? 140 : 200,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.03)",
            color: "#fff",
            fontSize: isMobileLayout ? 16 : 14,
            lineHeight: 1.45,
            boxSizing: "border-box",
            touchAction: "manipulation",
          }}
          disabled={disabled}
          placeholder="Write a message..."
        />
        <button
          onClick={onSend}
          disabled={disabled}
          style={{
            width: MOBILE_HIT,
            height: MOBILE_HIT,
            minWidth: MOBILE_HIT,
            minHeight: MOBILE_HIT,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "linear-gradient(135deg, rgba(186,158,255,0.34), rgba(132,85,239,0.32))",
            color: "#fff",
            fontWeight: 800,
            fontSize: 12,
            boxShadow: "0 10px 20px rgba(132,85,239,0.2)",
            flexShrink: 0,
            boxSizing: "border-box",
            touchAction: "manipulation",
            padding: "0 4px",
          }}
        >
          Send
        </button>
      </div>
      {uploading ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>uploading...</div> : null}
    </footer>
  );
}

const menuItemStyle: CSSProperties = {
  textAlign: "left",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 700,
  minHeight: 44,
  touchAction: "manipulation",
};
