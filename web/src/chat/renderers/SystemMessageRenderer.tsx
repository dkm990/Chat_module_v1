import type { ChatMessageVM } from "../types/viewModels";

type SystemMessageRendererProps = {
  message: ChatMessageVM;
};

export function SystemMessageRenderer(props: SystemMessageRendererProps) {
  const { message } = props;

  return (
    <div
      style={{
        maxWidth: "76%",
        fontSize: 12,
        opacity: 0.9,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
        borderRadius: 9999,
        padding: "6px 12px",
        textAlign: "center",
        boxShadow: "0 8px 16px rgba(0,0,0,0.18)",
      }}
    >
      {message.parsedBody.text?.trim() || "System update"}
    </div>
  );
}
