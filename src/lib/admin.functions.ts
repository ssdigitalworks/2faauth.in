import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export async function isAdminUser(userId?: string): Promise<boolean> {
  const uid = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return false;
  
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .in("role", ["super_admin", "admin"])
    .limit(1)
    .maybeSingle();
    
  if (error) throw new Error(error.message);
  return !!data;
}

export async function assertAdmin() {
  if (!(await isAdminUser())) throw new Error("Forbidden: admin role required");
}

export const settingsSchema = z.object({
  site_name: z.string().trim().min(1).max(120),
  site_description: z.string().trim().max(500).default(""),
  logo_url: z.string().trim().max(500).nullable().optional(),
  favicon_url: z.string().trim().max(500).nullable().optional(),
  contact_email: z.string().trim().max(200).nullable().optional(),
  contact_info: z.string().trim().max(1000).nullable().optional(),
  footer_text: z.string().trim().max(1000).nullable().optional(),
  copyright_text: z.string().trim().max(300).nullable().optional(),
});

export async function updateSiteSettings(data: unknown) {
  const validData = settingsSchema.parse(data);
  await assertAdmin();
  const user = (await supabase.auth.getUser()).data.user;
  
  const { error } = await supabase
    .from("site_settings")
    .update({ ...validData, updated_by: user?.id })
    .eq("id", 1);
    
  if (error) throw new Error(error.message);
  return { ok: true };
}

export const navItemSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().min(1).max(300).refine((v) => /^(https?:\/\/|\/)/i.test(v), {
    message: "URL must start with http://, https://, or /",
  }),
  position: z.number().int().min(0).max(999),
  visible: z.boolean(),
});

export async function saveNavItem(data: unknown) {
  const validData = navItemSchema.parse(data);
  await assertAdmin();
  
  if (validData.id) {
    const { error } = await supabase.from("nav_items").update({
      label: validData.label, url: validData.url, position: validData.position, visible: validData.visible,
    }).eq("id", validData.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("nav_items").insert({
      label: validData.label, url: validData.url, position: validData.position, visible: validData.visible,
    });
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

export async function deleteNavItem(data: { id: string }) {
  await assertAdmin();
  const { error } = await supabase.from("nav_items").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function reorderNavItems(data: { items: { id: string; position: number }[] }) {
  await assertAdmin();
  for (const it of data.items) {
    const { error } = await supabase.from("nav_items").update({ position: it.position }).eq("id", it.id);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

export async function checkIsAdmin() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return { isAdmin: false, userId: null };
  const isAdmin = await isAdminUser(user.id);
  return { isAdmin, userId: user.id };
}

const adLocationSchema = z.object({
  enabled: z.boolean(),
  slot_id: z.string().trim().max(64).default(""),
  format: z.enum(["auto", "rectangle", "vertical", "horizontal"]).default("auto"),
});

const adSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().trim().min(1).max(40).default("adsense"),
  adsense_client: z.string().trim().max(64).nullable().optional(),
  auto_ads: z.boolean().default(false),
  locations: z.record(z.string(), adLocationSchema),
});

export async function updateAdSettings(data: unknown) {
  const validData = adSettingsSchema.parse(data);
  await assertAdmin();
  const user = (await supabase.auth.getUser()).data.user;
  
  const { error } = await supabase
    .from("ad_settings")
    .update({
      enabled: validData.enabled,
      provider: validData.provider,
      adsense_client: validData.adsense_client ?? "",
      auto_ads: validData.auto_ads,
      locations: validData.locations,
      updated_by: user?.id,
    })
    .eq("id", 1);
    
  if (error) throw new Error(error.message);
  return { ok: true };
}
