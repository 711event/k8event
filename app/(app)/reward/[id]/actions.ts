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
  if (!parsed.success) return { error: "Invalid item id" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("request_redemption", { p_item: parsed.data });

  if (error) {
    if (/Insufficient tokens/i.test(error.message)) {
      return { error: "You don't have enough tokens." };
    }
    if (/out of stock/i.test(error.message)) {
      return { error: "This item is out of stock." };
    }
    if (/not available/i.test(error.message)) {
      return { error: "This item is no longer available." };
    }
    return { error: error.message };
  }

  revalidatePath("/shop");
  revalidatePath("/shop/" + parsed.data);
  revalidatePath("/redemptions");
  revalidatePath("/tokens");
  return { ok: true, redemptionId: data as string };
}
