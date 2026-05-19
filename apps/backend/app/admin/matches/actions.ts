"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";
import { malaysiaToUtc } from "@k8event/shared/time/malaysia";

const matchSchema = z
  .object({
    homeTeamId: z.string().uuid("Pick home team"),
    awayTeamId: z.string().uuid("Pick away team"),
    // datetime-local format: 2026-05-18T20:00 — interpreted as GMT+8
    kickoffLocal: z.string().min(10, "Kickoff required"),
    tokenReward: z.coerce.number().int().positive("Reward must be > 0"),
  })
  .refine((d) => d.homeTeamId !== d.awayTeamId, {
    message: "Home and away must differ",
    path: ["awayTeamId"],
  });

export type MatchFormState = { ok: true; id?: string } | { error: string } | undefined;

export async function createMatchAction(
  _prev: MatchFormState,
  formData: FormData,
): Promise<MatchFormState> {
  await requireRole("admin");
  const parsed = matchSchema.safeParse({
    homeTeamId: formData.get("homeTeamId"),
    awayTeamId: formData.get("awayTeamId"),
    kickoffLocal: formData.get("kickoffLocal"),
    tokenReward: formData.get("tokenReward"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const kickoffUtc = malaysiaToUtc(parsed.data.kickoffLocal).toISOString();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .insert({
      home_team_id: parsed.data.homeTeamId,
      away_team_id: parsed.data.awayTeamId,
      kickoff_at: kickoffUtc,
      token_reward: parsed.data.tokenReward,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/admin/matches");
  revalidatePath("/matches");
  return { ok: true, id: data.id };
}

export async function setMatchStatusAction(
  id: string,
  status: "scheduled" | "locked" | "cancelled",
): Promise<MatchFormState> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("matches").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${id}`);
  revalidatePath("/matches");
  revalidatePath(`/matches/${id}`);
  return { ok: true };
}

export async function deleteMatchAction(id: string): Promise<MatchFormState> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/matches");
  revalidatePath("/matches");
  return { ok: true };
}

const settleSchema = z.object({
  id: z.string().uuid(),
  result: z.enum(["home", "away", "draw"]),
});

export async function settleMatchAction(
  id: string,
  result: "home" | "away" | "draw",
): Promise<MatchFormState> {
  await requireRole("admin");
  const parsed = settleSchema.safeParse({ id, result });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("settle_match", {
    p_match_id: parsed.data.id,
    p_result: parsed.data.result,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${parsed.data.id}`);
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  return { ok: true };
}
