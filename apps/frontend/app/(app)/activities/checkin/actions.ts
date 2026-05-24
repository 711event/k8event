"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";

export async function checkinAction(activityId: string) {
  await requireRole("player");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("perform_checkin", {
    p_activity_id: activityId,
  });

  if (error) {
    if (error.message?.includes("already_checked_in")) {
      return { error: "今日已签到" };
    }
    if (error.message?.includes("activity_not_found")) {
      return { error: "活动不存在或已关闭" };
    }
    return { error: error.message };
  }

  revalidatePath("/activities/checkin");
  revalidatePath("/activities");
  revalidatePath("/event");

  return { ok: true, data: data as { streak_day: number; tokens_awarded: number } };
}
