import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_name: string;
  site_description: string;
  logo_url: string | null;
  favicon_url: string | null;
  contact_email: string | null;
  contact_info: string | null;
  footer_text: string | null;
  copyright_text: string | null;
};

export type NavItem = {
  id: string;
  label: string;
  url: string;
  position: number;
  visible: boolean;
};

let cachedSettings: SiteSettings | null = null;
let cachedNavItems: NavItem[] | null = null;

export function useSiteSettings() {
  const [data, setData] = useState<SiteSettings | null>(cachedSettings);
  const [isLoading, setIsLoading] = useState(!cachedSettings);

  useEffect(() => {
    supabase.from("site_settings")
      .select("site_name,site_description,logo_url,favicon_url,contact_email,contact_info,footer_text,copyright_text")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          cachedSettings = data;
          setData(data);
        }
        setIsLoading(false);
      });
  }, []);

  return { data, isLoading };
}

export function useNavItems(opts: { onlyVisible?: boolean } = {}) {
  const [data, setData] = useState<NavItem[]>(cachedNavItems || []);
  const [isLoading, setIsLoading] = useState(!cachedNavItems);

  useEffect(() => {
    let q = supabase.from("nav_items").select("id,label,url,position,visible").order("position", { ascending: true });
    if (opts.onlyVisible) q = q.eq("visible", true);
    
    q.then(({ data }) => {
      if (data) {
        cachedNavItems = data;
        setData(data);
      }
      setIsLoading(false);
    });
  }, [opts.onlyVisible]);

  return { data, isLoading };
}
