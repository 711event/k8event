"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";

export type ActivityType =
  | "worldcup_prediction"
  | "daily_checkin"
  | "lucky_draw"
  | "spin_wheel"
  | "deposit_mission"
  | "referral_mission";

export interface ActivityFormData {
  type: ActivityType;
  name: string;
  slug?: string;
  description?: string;
  banner_url?: string;
  rules?: string;
  start_at?: string;
  end_at?: string;
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;
  settings: Record<string, unknown>;
}

export async function createActivityAction(data: ActivityFormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("activities").insert({
    type: data.type,
    name: data.name,
    slug: data.slug || null,
    description: data.description || null,
    banner_url: data.banner_url || null,
    rules: data.rules || null,
    start_at: data.start_at || null,
    end_at: data.end_at || null,
    is_active: data.is_active,
    is_visible: data.is_visible,
    sort_order: data.sort_order,
    settings: data.settings,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/activities");
  return { ok: true };
}

export async function updateActivityAction(id: string, data: Partial<ActivityFormData>) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.slug !== undefined) patch.slug = data.slug || null;
  if (data.description !== undefined) patch.description = data.description || null;
  if (data.banner_url !== undefined) patch.banner_url = data.banner_url || null;
  if (data.rules !== undefined) patch.rules = data.rules || null;
  if (data.start_at !== undefined) patch.start_at = data.start_at || null;
  if (data.end_at !== undefined) patch.end_at = data.end_at || null;
  if (data.is_active !== undefined) patch.is_active = data.is_active;
  if (data.is_visible !== undefined) patch.is_visible = data.is_visible;
  if (data.sort_order !== undefined) patch.sort_order = data.sort_order;
  if (data.settings !== undefined) patch.settings = data.settings;

  const { error } = await supabase.from("activities").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/activities");
  revalidatePath(`/admin/activities/${id}`);
  return { ok: true };
}

export async function toggleActivityField(
  id: string,
  field: "is_active" | "is_visible",
  value: boolean,
) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activities").update({ [field]: value }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/activities");
  return { ok: true };
}
