import type { ReactNode } from "react";

type AppLayoutProps = {
  sidebar: ReactNode;
  chatList: ReactNode;
  chatCanvas: ReactNode;
};

export function AppLayout({ sidebar, chatList, chatCanvas }: AppLayoutProps) {
  return (
    <div
      style={{
        height: "100%",
        minHeight: "100%",
        width: "100%",
        maxWidth: "100vw",
        display: "grid",
        gridTemplateColumns: "minmax(200px, 240px) minmax(280px, 360px) minmax(0, 1fr)",
        background:
          "radial-gradient(circle at 8% 8%, rgba(132,85,239,0.16), transparent 28%), radial-gradient(circle at 92% 18%, rgba(186,158,255,0.1), transparent 32%), #0c0e12",
        color: "#f6f6fc",
        fontFamily: "Manrope, sans-serif",
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(16,18,24,0.88)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          minWidth: 0,
          minHeight: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {sidebar}
      </aside>
      <section
        style={{
          borderRight: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(18,21,28,0.76)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          minWidth: 0,
          minHeight: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {chatList}
      </section>
      <main
        style={{
          minWidth: 0,
          minHeight: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {chatCanvas}
      </main>
    </div>
  );
}
