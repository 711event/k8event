"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";

const idSchema = z.string().uuid();

export type RedeemState = { ok: true; redemptionId: string } | { error: string } | undefined;

export async function redeemAction(itemId: string): Promise<RedeemState> {
  await requireRole("player");
  const parsed = idSchema.safeParse(itemId);
  if (!parsed.success) return { error: "奖品 ID 无效" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("request_redemption", { p_item: parsed.data });

  if (error) {
    if (/Insufficient tokens/i.test(error.message)) {
      return { error: "Token 余额不足。" };
    }
    if (/out of stock/i.test(error.message)) {
      return { error: "本奖品已售罄。" };
    }
    if (/not available/i.test(error.message)) {
      return { error: "本奖品已下架。" };
    }
    return { error: error.message };
  }

  revalidatePath("/reward");
  revalidatePath("/reward/" + parsed.data);
  revalidatePath("/redemptions");
  revalidatePath("/tokens");
  revalidatePath("/event");
  return { ok: true, redemptionId: data as string };
}
