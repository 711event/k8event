"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";
import { getGroupId } from "@/lib/get-group";

const decideSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "fulfilled", "rejected"]),
});

export type DecideState = { ok: true } | { error: string } | undefined;

export async function decideRedemptionAction(
  id: string,
  status: "approved" | "fulfilled" | "rejected",
): Promise<DecideState> {
  await requireRole("admin");
  const parsed = decideSchema.safeParse({ id, status });
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createSupabaseServerClient();

  // Verify the redemption's player belongs to this group before acting
  const { data: req } = await supabase
    .from("redemption_requests")
    .select("id, player_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!req) return { error: "Not found" };

  const { data: playerProfile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", req.player_id)
    .eq("group_id", getGroupId())
    .maybeSingle();
  if (!playerProfile) return { error: "Not found" };

  const { error } = await supabase.rpc("decide_redemption", {
    p_id: parsed.data.id,
    p_status: parsed.data.status,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/redemptions");
  revalidatePath("/admin");
  return { ok: true };
}
