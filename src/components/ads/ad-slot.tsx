import { useEffect, useRef, useState } from "react";
import { useAdSettings, type AdLocationKey } from "@/hooks/use-ad-settings";
import { isAdsenseAllowedHost } from "@/lib/adsense-config";


declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const SCRIPT_ID = "adsbygoogle-js";
let scriptPromise: Promise<void> | null = null;

function loadAdsenseScript(client: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => { scriptPromise = null; reject(new Error("ad script failed")); }, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    s.onload = () => { s.dataset.loaded = "true"; resolve(); };
    s.onerror = () => { scriptPromise = null; s.remove(); reject(new Error("ad script failed")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface AdSlotProps {
  location: AdLocationKey;
  className?: string;
  label?: string;
}

/**
 * Renders an ad if the admin has globally enabled ads, configured an AdSense
 * client ID, enabled this specific location, and provided a slot ID. Otherwise
 * renders nothing. No layout space is reserved when disabled.
 */
export function AdSlot({ location, className, label = "Advertisement" }: AdSlotProps) {
  const { data } = useAdSettings();
  
  const insRef = useRef<HTMLModElement | null>(null);
  const [pushed, setPushed] = useState(false);

  const loc = data?.locations[location];
  const client = data?.adsense_client?.trim() ?? "";
  const slot = loc?.slot_id?.trim() ?? "";
  const enabled =
    !!data?.enabled &&
    !!loc?.enabled &&
    !!client &&
    !!slot &&
    isAdsenseAllowedHost();

  useEffect(() => {
    if (!enabled || pushed) return;
    let cancelled = false;
    loadAdsenseScript(client)
      .then(() => {
        if (cancelled) return;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setPushed(true);
        } catch { /* ignore */ }
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [enabled, client, slot, pushed]);

  if (!enabled) return null;

  const fmt = loc?.format ?? "auto";
  return (
    <aside aria-label={label} className={className ?? "w-full min-h-[120px] my-4"}>
      <ins
        ref={insRef as unknown as React.Ref<HTMLModElement>}
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={fmt}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
