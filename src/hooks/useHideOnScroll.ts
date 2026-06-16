import { useEffect, useState } from "react";

/**
 * Returns `true` while the user has scrolled down inside the element matching
 * `selector`, and `false` again once they return to the top. Mobile only —
 * no-ops (always false) at or above the md breakpoint.
 */
export function useHideOnScroll(selector: string): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;

    const mq = window.matchMedia("(max-width: 767px)");
    let lastTop = el.scrollTop;

    const update = () => {
      const top = el.scrollTop;
      const goingDown = top > lastTop;
      if (top <= 4) {
        setHidden(false);
      } else if (goingDown && top > 48) {
        setHidden(true);
      }
      lastTop = top;
    };

    const onBreakpoint = () => {
      if (!mq.matches) setHidden(false);
    };

    el.addEventListener("scroll", update, { passive: true });
    mq.addEventListener("change", onBreakpoint);
    return () => {
      el.removeEventListener("scroll", update);
      mq.removeEventListener("change", onBreakpoint);
    };
  }, [selector]);

  return hidden;
}
