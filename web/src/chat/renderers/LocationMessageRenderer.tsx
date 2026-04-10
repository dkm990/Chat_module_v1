import type { ChatMessageVM } from "../types/viewModels";

type LocationMessageRendererProps = {
  message: ChatMessageVM;
};

export function LocationMessageRenderer(props: LocationMessageRendererProps) {
  const { message } = props;
  const location = message.parsedBody.location;
  if (!location) return null;

  return (
    <div
      style={{
        maxWidth: "72%",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: message.isOwn
          ? "linear-gradient(180deg, rgba(186,158,255,0.24), rgba(132,85,239,0.18))"
          : "rgba(255,255,255,0.06)",
        overflow: "hidden",
        boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>Shared location</div>
        <div style={{ fontSize: 12, opacity: 0.82, marginTop: 2 }}>
          {Number(location.lat).toFixed(5)}, {Number(location.lng).toFixed(5)}
        </div>
        {location.label ? <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>{location.label}</div> : null}
      </div>
      <div
        style={{
          padding: "10px 12px",
          background: "linear-gradient(135deg, rgba(61,75,110,0.5), rgba(23,31,51,0.5))",
          minHeight: 62,
          display: "grid",
          alignContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.75 }}>Map preview placeholder</div>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(`${location.lat},${location.lng}`)}`}
          target="_blank"
          rel="noreferrer"
          style={{
            justifySelf: "start",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            borderRadius: 8,
            padding: "6px 9px",
            fontSize: 11,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Open in maps
        </a>
      </div>
    </div>
  );
}
