import type { AttachmentVM } from "../types/viewModels";

type AttachmentMessageRendererProps = {
  apiBase: string;
  attachments: AttachmentVM[];
};

export function AttachmentMessageRenderer(props: AttachmentMessageRendererProps) {
  const { apiBase, attachments } = props;

  return (
    <div className="chat-attachment-list">
      {attachments.map((attachment, index) => {
        const src = resolveAttachmentUrl(apiBase, attachment.publicUrl);
        const isImage = isImageAttachment(attachment);
        const attachmentLabel = attachment.storageKey || "Attachment";
        return (
          <div key={`${attachment.storageKey}-${index}`} className="chat-attachment-item" style={{ marginTop: index > 0 ? 8 : 0 }}>
            {!src ? (
              <div className="chat-attachment-fallback" title="Attachment URL is missing">
                <div className="chat-attachment-fallback__title">Attachment unavailable</div>
                <div className="chat-attachment-fallback__meta">{attachmentLabel}</div>
              </div>
            ) : isImage ? (
              <div className="chat-attachment-media chat-attachment-media--image">
                <img
                  className="chat-attachment-image"
                  src={src}
                  alt="uploaded attachment"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="chat-attachment-media chat-attachment-media--video">
                <video className="chat-attachment-video" src={src} controls preload="metadata" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function resolveAttachmentUrl(apiBase: string, publicUrl: string | null | undefined) {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const trimmed = publicUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const suffix = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${apiBase.replace(/\/+$/, "")}${suffix}`;
}

function isImageAttachment(attachment: AttachmentVM) {
  if (attachment.kind === "image") return true;
  return (attachment.mimeType || "").toLowerCase().startsWith("image/");
}
