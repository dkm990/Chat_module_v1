import { useEffect, useState } from "react";

/**
 * Approximates OS keyboard / UI chrome overlap below the layout viewport.
 * Uses Visual Viewport API when available; 0 on desktop / unsupported browsers.
 */
export function useVisualViewportBottomInset(enabled: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) {
      setInset(0);
      return;
    }

    const update = () => {
      const ih = window.innerHeight;
      const overlap = Math.max(0, ih - vv.height - vv.offsetTop);
      setInset(overlap);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return enabled ? inset : 0;
}
