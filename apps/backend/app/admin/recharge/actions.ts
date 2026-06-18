"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";
import { requireRole } from "@k8event/shared/auth/require-role";
import { getGroupId } from "@/lib/get-group";

const rawRowSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  username: z.string().min(1).max(64),
  amount: z.number().nonnegative(),
});

const previewInputSchema = z.array(rawRowSchema).max(5000);

export type PreviewRow = {
  date: string;
  username: string;
  amount: number;
  status: "ok" | "unknown_user" | "unchanged" | "overwrite";
  playerId: string | null;
  existingAmount: number | null;
};

export type PreviewResult = {
  rows: PreviewRow[];
  summary: { ok: number; unknown_user: number; unchanged: number; overwrite: number };
  error?: string;
};

export async function previewRechargeAction(input: unknown): Promise<PreviewResult> {
  await requireRole("admin");
  const parsed = previewInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      rows: [],
      summary: { ok: 0, unknown_user: 0, unchanged: 0, overwrite: 0 },
      error: parsed.error.issues[0]?.message ?? "Invalid CSV rows",
    };
  }

  const rows = parsed.data;
  const supabase = await createSupabaseServerClient();

  // Match usernames case-insensitively (and trimmed) so an import row "z6771"
  // resolves to player "Z6771". Player usernames are unique per group — auth
  // emails (<username>@k8event.local) are case-insensitive, so two profiles
  // differing only in case can't exist — making the lowercased key unambiguous.
  // Fetch all of this group's players and key the lookup by normalized username.
  const norm = (u: string) => u.trim().toLowerCase();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username")
    .eq("role", "player")
    .eq("group_id", getGroupId());

  const userMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.username) userMap.set(norm(p.username), p.user_id);
  }

  const playerIds = Array.from(new Set([...userMap.values()]));
  const dates = Array.from(new Set(rows.map((r) => r.date)));

  let existingMap = new Map<string, number>();
  if (playerIds.length && dates.length) {
    const { data: existing } = await supabase
      .from("daily_recharge")
      .select("player_id, recharge_date, amount")
      .in("player_id", playerIds)
      .in("recharge_date", dates);
    for (const e of existing ?? []) {
      existingMap.set(`${e.player_id}_${e.recharge_date}`, Number(e.amount));
    }
  }

  const enriched: PreviewRow[] = rows.map((r) => {
    const playerId = userMap.get(norm(r.username)) ?? null;
    if (!playerId) {
      return {
        date: r.date,
        username: r.username,
        amount: r.amount,
        playerId: null,
        status: "unknown_user",
        existingAmount: null,
      };
    }
    const existing = existingMap.get(`${playerId}_${r.date}`);
    if (existing === undefined) {
      return { ...r, playerId, status: "ok", existingAmount: null };
    }
    if (Math.abs(existing - r.amount) < 0.001) {
      return { ...r, playerId, status: "unchanged", existingAmount: existing };
    }
    return { ...r, playerId, status: "overwrite", existingAmount: existing };
  });

  const summary = { ok: 0, unknown_user: 0, unchanged: 0, overwrite: 0 };
  for (const r of enriched) summary[r.status]++;

  return { rows: enriched, summary };
}

const importRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().nonnegative(),
  playerId: z.string().uuid(),
});

export async function importRechargeAction(input: unknown): Promise<{ inserted: number; error?: string }> {
  const user = await requireRole("admin");
  const parsed = z.array(importRowSchema).max(5000).safeParse(input);
  if (!parsed.success) {
    return { inserted: 0, error: parsed.error.issues[0]?.message ?? "Invalid rows" };
  }
  if (!parsed.data.length) return { inserted: 0 };

  // Re-validate that all player IDs belong to this group (prevents cross-group injection)
  const supabase = await createSupabaseServerClient();
  const submittedPlayerIds = Array.from(new Set(parsed.data.map((r) => r.playerId)));
  const { data: validProfiles } = await supabase
    .from("profiles")
    .select("user_id")
    .in("user_id", submittedPlayerIds)
    .eq("group_id", getGroupId())
    .eq("role", "player");
  const validPlayerIds = new Set((validProfiles ?? []).map((p) => p.user_id));
  const filteredRows = parsed.data.filter((r) => validPlayerIds.has(r.playerId));
  if (filteredRows.length === 0) return { inserted: 0 };

  const admin = getSupabaseAdmin();
  const payload = filteredRows.map((r) => ({
    player_id: r.playerId,
    recharge_date: r.date,
    amount: r.amount,
    source: "csv",
    imported_by: user.id,
  }));

  const { error, count } = await admin
    .from("daily_recharge")
    .upsert(payload, { onConflict: "player_id,recharge_date", count: "exact" });

  if (error) return { inserted: 0, error: error.message };

  // Trigger referral rewards for players whose recharge was just imported
  const importedPlayerIds = Array.from(new Set(filteredRows.map((r) => r.playerId)));
  if (importedPlayerIds.length > 0) {
    await admin.rpc("process_referral_rewards", { p_player_ids: importedPlayerIds });
  }

  revalidatePath("/admin/recharge");
  revalidatePath("/admin");
  revalidatePath("/admin/referrals");
  return { inserted: count ?? filteredRows.length };
}
