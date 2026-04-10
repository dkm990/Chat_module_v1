import { MessageInput } from "@chatscope/chat-ui-kit-react";
import { useEffect, useRef, useState } from "react";
import { useChatModule } from "../hooks/useChatModule";

type MessageComposerProps = {
  roomId: string;
  disabled: boolean;
  uploading: boolean;
  isMobileLayout?: boolean;
  onTextAreaFocus?: () => void;
  onLocalError?: (message: string) => void;
};

export function MessageComposer(props: MessageComposerProps) {
  const { roomId, disabled, uploading, isMobileLayout, onTextAreaFocus, onLocalError } = props;
  const chat = useChatModule();
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setText("");
  }, [roomId]);

  function handleComposerChange(nextText: string) {
    setText(nextText);
    if (!roomId) return;
    chat.handleComposerTextChange(roomId, nextText);
  }

  async function handleSend() {
    if (!roomId || !text.trim()) return;
    await chat.sendText(roomId, text.trim());
    setText("");
    chat.handleComposerTextChange(roomId, "");
  }

  async function handleFilePick(file: File) {
    if (!roomId) return;
    await chat.sendAttachments(roomId, [file]);
  }

  async function handleSendLocation() {
    if (!roomId) return;
    if (!navigator.geolocation) {
      onLocalError?.("Geolocation is not supported.");
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
      onLocalError?.("Failed to get location.");
      return;
    }
    await chat.sendLocation(roomId, { lat: coords.lat, lng: coords.lng, label: null });
  }

  return (
    <div
      className="chat-sdk-composer"
      onFocusCapture={() => onTextAreaFocus?.()}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 10,
        alignItems: "end",
        padding: isMobileLayout ? "10px 14px 14px" : "12px 18px 18px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(9,12,18,0.72)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void handleFilePick(file);
          event.currentTarget.value = "";
        }}
      />
      <MessageInput
        value={text}
        placeholder="Write a message..."
        disabled={disabled}
        sendButton={true}
        attachButton={true}
        attachDisabled={disabled || uploading}
        sendDisabled={disabled || uploading || !text.trim()}
        fancyScroll={false}
        onAttachClick={() => fileInputRef.current?.click()}
        onChange={(_, textContent, innerText) => {
          handleComposerChange((innerText || textContent || "").replace(/\u00a0/g, " "));
        }}
        onSend={() => {
          void handleSend();
        }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => {
            void handleSendLocation();
          }}
          disabled={disabled || uploading}
          className="chat-sdk-composer-action"
          title="Share location"
        >
          Location
        </button>
      </div>
    </div>
  );
}
