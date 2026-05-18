"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/require-role";

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
  const usernames = Array.from(new Set(rows.map((r) => r.username)));
  const supabase = await createSupabaseServerClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username")
    .in("username", usernames)
    .eq("role", "player");

  const userMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.username) userMap.set(p.username, p.user_id);
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
    const playerId = userMap.get(r.username) ?? null;
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

  const admin = getSupabaseAdmin();
  const payload = parsed.data.map((r) => ({
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

  revalidatePath("/admin/recharge");
  revalidatePath("/admin");
  return { inserted: count ?? payload.length };
}
