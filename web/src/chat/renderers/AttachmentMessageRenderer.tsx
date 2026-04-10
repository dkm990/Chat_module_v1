import type { AttachmentVM } from "../types/viewModels";

type AttachmentMessageRendererProps = {
  apiBase: string;
  attachments: AttachmentVM[];
};

export function AttachmentMessageRenderer(props: AttachmentMessageRendererProps) {
  const { apiBase, attachments } = props;

  return (
    <>
      {attachments.map((attachment, index) => {
        const src = resolveAttachmentUrl(apiBase, attachment.publicUrl);
        return (
          <div key={`${attachment.storageKey}-${index}`} style={{ marginTop: index > 0 ? 8 : 0 }}>
            {attachment.kind === "image" ? (
              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(10,12,18,0.45)",
                }}
              >
                <img
                  src={src}
                  alt="uploaded attachment"
                  style={{ display: "block", width: "100%", maxWidth: 300, objectFit: "cover" }}
                />
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(10,12,18,0.45)",
                }}
              >
                <video src={src} controls style={{ display: "block", width: "100%", maxWidth: 320 }} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function resolveAttachmentUrl(apiBase: string, publicUrl: string) {
  if (/^https?:\/\//i.test(publicUrl)) return publicUrl;
  return `${apiBase.replace(/\/+$/, "")}${publicUrl}`;
}
