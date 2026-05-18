"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";

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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("predictions").insert({
    match_id: parsed.data.matchId,
    player_id: user.id,
    pick: parsed.data.pick,
  });

  if (error) {
    // Map known DB trigger errors to friendly messages
    if (/Player not eligible/i.test(error.message)) {
      return { error: "You need to recharge at least 500 today to predict." };
    }
    if (/already started/i.test(error.message)) {
      return { error: "Kickoff has already passed for this match." };
    }
    if (/not open for predictions/i.test(error.message)) {
      return { error: "Predictions are closed for this match." };
    }
    if (/duplicate key|already exists/i.test(error.message)) {
      return { error: "You have already submitted a prediction for this match." };
    }
    return { error: error.message };
  }

  revalidatePath(`/matches/${parsed.data.matchId}`);
  revalidatePath("/matches");
  revalidatePath("/history");
  return { ok: true };
}
