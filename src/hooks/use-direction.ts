import { useEffect, useState } from "react";

/**
 * Returns the resolved text direction ('ltr' | 'rtl') for the given element
 * (or <html> by default). Reacts to attribute changes so framer-motion
 * variants can flip when direction toggles.
 */
export function useDirection(target?: HTMLElement | null): "ltr" | "rtl" {
  const [dir, setDir] = useState<"ltr" | "rtl">(() => {
    if (typeof document === "undefined") return "ltr";
    const el = target ?? document.documentElement;
    return getComputedStyle(el).direction === "rtl" ? "rtl" : "ltr";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = target ?? document.documentElement;
    const update = () =>
      setDir(getComputedStyle(el).direction === "rtl" ? "rtl" : "ltr");
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["dir", "lang", "class"] });
    if (el !== document.documentElement) {
      obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["dir", "lang", "class"],
      });
    }
    return () => obs.disconnect();
  }, [target]);

  return dir;
}
