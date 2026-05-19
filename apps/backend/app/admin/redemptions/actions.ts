"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";

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
  const { error } = await supabase.rpc("decide_redemption", {
    p_id: parsed.data.id,
    p_status: parsed.data.status,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/redemptions");
  revalidatePath("/admin");
  return { ok: true };
}
