import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type SidebarDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function SidebarDrawer({ open, onClose, children }: SidebarDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          border: "none",
          padding: 0,
          margin: 0,
          background: open ? "rgba(0,0,0,0.52)" : "transparent",
          opacity: open ? 1 : 0,
          transition: "opacity 200ms ease, background-color 200ms ease",
          cursor: open ? "pointer" : "default",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: "min(300px, calc(100vw - env(safe-area-inset-left, 0px) - 20px))",
          boxSizing: "border-box",
          paddingTop: "max(0px, env(safe-area-inset-top, 0px))",
          paddingBottom: "max(0px, env(safe-area-inset-bottom, 0px))",
          paddingLeft: "max(0px, env(safe-area-inset-left, 0px))",
          background: "rgba(16,18,24,0.96)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          boxShadow: open ? "12px 0 40px rgba(0,0,0,0.45)" : "none",
          transform: open ? "translate3d(0,0,0)" : "translate3d(-100%,0,0)",
          transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          overscrollBehaviorX: "contain",
          overscrollBehaviorY: "contain",
          touchAction: "pan-y",
          willChange: open ? "transform" : "auto",
        }}
      >
        {children}
      </aside>
    </div>
  );
}
