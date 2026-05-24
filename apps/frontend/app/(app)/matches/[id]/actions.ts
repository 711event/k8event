"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";

const pickSchema = z.object({
  matchId: z.string().uuid(),
  pick: z.enum(["home", "away"]),
});

export type PredictState = { ok: true } | { error: string } | undefined;

export async function submitPredictionAction(
  _prev: PredictState,
  formData: FormData,
): Promise<PredictState> {
  const user = await requireRole("player");
  const parsed = pickSchema.safeParse({
    matchId: formData.get("matchId"),
    pick: formData.get("pick"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("predictions").insert({
    match_id: parsed.data.matchId,
    player_id: user.id,
    pick: parsed.data.pick,
  });

  if (error) {
    if (/Player not eligible/i.test(error.message)) {
      return { error: "暂无竞猜机会。每天充值满 500 可获得 1 次机会，机会可累计使用。" };
    }
    if (/already started/i.test(error.message)) {
      return { error: "已超过开赛时间,无法再提交。" };
    }
    if (/not open for predictions/i.test(error.message)) {
      return { error: "本场比赛已停止竞猜。" };
    }
    if (/duplicate key|already exists/i.test(error.message)) {
      return { error: "你已经预测过这场比赛了。" };
    }
    return { error: error.message };
  }

  revalidatePath(`/matches/${parsed.data.matchId}`);
  revalidatePath("/matches");
  revalidatePath("/event");
  revalidatePath("/history");
  return { ok: true };
}
