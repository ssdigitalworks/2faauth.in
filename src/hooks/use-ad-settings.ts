import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const AD_LOCATIONS = [
  { key: "home_top", label: "Home — Top (above tool)" },
  { key: "home_sidebar", label: "Home — Sidebar (next to tool)" },
  { key: "home_bottom", label: "Home — Bottom (below tool)" },
  { key: "header", label: "Header (site-wide, under nav)" },
  { key: "footer", label: "Footer (site-wide, above footer)" },
  { key: "between_content", label: "Between Content (article pages)" },
] as const;

export type AdLocationKey = (typeof AD_LOCATIONS)[number]["key"];

export type AdLocationConfig = {
  enabled: boolean;
  slot_id: string;
  format: "auto" | "rectangle" | "vertical" | "horizontal";
};

export type AdSettings = {
  enabled: boolean;
  provider: string;
  adsense_client: string | null;
  auto_ads: boolean;
  locations: Record<AdLocationKey, AdLocationConfig>;
};

const defaults: AdSettings = {
  enabled: false,
  provider: "adsense",
  adsense_client: "",
  auto_ads: false,
  locations: AD_LOCATIONS.reduce((acc, l) => {
    acc[l.key] = { enabled: false, slot_id: "", format: "auto" };
    return acc;
  }, {} as Record<AdLocationKey, AdLocationConfig>),
};

let cachedAdSettings: AdSettings | null = null;

export function useAdSettings() {
  const [data, setData] = useState<AdSettings>(cachedAdSettings || defaults);
  const [isLoading, setIsLoading] = useState(!cachedAdSettings);

  useEffect(() => {
    supabase
      .from("ad_settings")
      .select("enabled,provider,adsense_client,auto_ads,locations")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const finalData = {
            enabled: !!data.enabled,
            provider: data.provider ?? "adsense",
            adsense_client: data.adsense_client ?? "",
            auto_ads: !!data.auto_ads,
            locations: { ...defaults.locations, ...((data.locations as Record<AdLocationKey, AdLocationConfig>) ?? {}) },
          };
          cachedAdSettings = finalData;
          setData(finalData);
        }
        setIsLoading(false);
      });
  }, []);

  return { data, isLoading };
}
