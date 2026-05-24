import { createSupabaseServerClient } from "@k8event/shared/supabase/server";

export function getGroupId(): string {
  const id = process.env.GROUP_ID;
  if (!id) throw new Error("GROUP_ID env var not set");
  return id;
}

/**
 * Returns all player user_ids belonging to the current group.
 * Used to filter tables linked via player_id (recharge, redemptions, checkins, etc.)
 */
export async function getGroupPlayerIds(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("group_id", getGroupId())
    .eq("role", "player");
  return (data ?? []).map((r: { user_id: string }) => r.user_id);
}
