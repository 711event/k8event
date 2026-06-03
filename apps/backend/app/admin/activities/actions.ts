"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";

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
    group_id: getGroupId(),
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("activities").update(patch as any).eq("id", id).eq("group_id", getGroupId());
  if (error) return { error: error.message };
  revalidatePath("/admin/activities");
  revalidatePath(`/admin/activities/${id}`);
  return { ok: true };
}

export async function updatePredictionTokenRewardAction(
  activityId: string,
  tokenReward: number,
): Promise<{ ok?: true; error?: string }> {
  await requireRole("admin");
  if (!Number.isInteger(tokenReward) || tokenReward < 1 || tokenReward > 9999)
    return { error: "Invalid token reward" };

  const supabase = await createSupabaseServerClient();
  const groupId = getGroupId();

  // Fetch current settings to merge
  const { data: activity } = await supabase
    .from("activities")
    .select("settings")
    .eq("id", activityId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (!activity) return { error: "Activity not found" };

  // Save token reward in this group's activity settings only.
  // settle_match() reads prediction_token_reward per-player from their group's
  // activity settings, so no cross-group bulk update of matches is needed.
  const { error: actErr } = await supabase
    .from("activities")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ settings: { ...(activity.settings as any), prediction_token_reward: tokenReward } } as any)
    .eq("id", activityId)
    .eq("group_id", groupId);

  if (actErr) return { error: actErr.message };

  revalidatePath(`/admin/activities/${activityId}`);
  return { ok: true };
}

export async function toggleActivityField(
  id: string,
  field: "is_active" | "is_visible",
  value: boolean,
) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("activities").update({ [field]: value } as any).eq("id", id).eq("group_id", getGroupId());
  if (error) return { error: error.message };
  revalidatePath("/admin/activities");
  return { ok: true };
}
