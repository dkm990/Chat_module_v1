import { AttachmentMessageRenderer } from "./AttachmentMessageRenderer";
import { LocationMessageRenderer } from "./LocationMessageRenderer";
import { SystemMessageRenderer } from "./SystemMessageRenderer";
import type { ChatMessageVM } from "../types/viewModels";

type MessageBodyRendererProps = {
  apiBase: string;
  message: ChatMessageVM;
  roomTitle: string;
  showSender: boolean;
  groupEnd: boolean;
};

export function MessageBodyRenderer(props: MessageBodyRendererProps) {
  const { apiBase, message, roomTitle, showSender, groupEnd } = props;
  const hasText = !!message.parsedBody.text?.trim();

  if (message.type === "system") {
    return <SystemMessageRenderer message={message} />;
  }

  if (message.type === "location" || message.parsedBody.location) {
    return <LocationMessageRenderer message={message} />;
  }

  const bubbleRadius = message.isOwn
    ? groupEnd
      ? "16px 16px 6px 16px"
      : "16px"
    : groupEnd
      ? "16px 16px 16px 6px"
      : "16px";

  return (
    <div style={{ width: "min(100%, 640px)", display: "grid", justifyItems: message.isOwn ? "end" : "start" }}>
      {!message.isOwn && showSender ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              fontSize: 11,
              fontWeight: 800,
              background: "linear-gradient(135deg, rgba(132,85,239,0.45), rgba(94,44,145,0.35))",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            {roomTitle.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ fontSize: 11, opacity: 0.76 }}>{roomTitle}</div>
        </div>
      ) : null}

      <div
        style={{
          maxWidth: "72%",
          padding: "10px 12px",
          borderRadius: bubbleRadius,
          background: message.isOwn
            ? "linear-gradient(135deg, rgba(186,158,255,0.34), rgba(132,85,239,0.3))"
            : "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          transition: "transform 100ms ease, box-shadow 120ms ease",
        }}
      >
        {hasText ? <div style={{ fontSize: 14, lineHeight: 1.45 }}>{message.parsedBody.text}</div> : null}
        {message.attachments.length > 0 ? (
          <div style={{ marginTop: hasText ? 8 : 0 }}>
            <AttachmentMessageRenderer apiBase={apiBase} attachments={message.attachments} />
          </div>
        ) : null}
      </div>

      {groupEnd ? (
        <div style={{ fontSize: 10, opacity: 0.56, marginTop: 3 }}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {message.deliveryState === "pending" ? " · sending" : ""}
          {message.deliveryState === "failed" ? " · failed" : ""}
        </div>
      ) : null}
    </div>
  );
}
