"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";

const rewardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().transform((v) => v?.trim() || null),
  imageUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  cost: z.coerce.number().int().positive(),
  stock: z.coerce.number().int().min(-1),
});

export type RewardFormState = { ok: true } | { error: string } | undefined;

export async function createRewardAction(
  _prev: RewardFormState,
  formData: FormData,
): Promise<RewardFormState> {
  await requireRole("admin");
  const parsed = rewardSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    imageUrl: formData.get("imageUrl") ?? "",
    cost: formData.get("cost"),
    stock: formData.get("stock"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reward_items").insert({
    name: parsed.data.name,
    description: parsed.data.description,
    image_url: parsed.data.imageUrl,
    cost: parsed.data.cost,
    stock: parsed.data.stock,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/rewards");
  revalidatePath("/shop");
  return { ok: true };
}

export async function toggleRewardActiveAction(id: string, active: boolean): Promise<RewardFormState> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reward_items").update({ is_active: active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/rewards");
  revalidatePath("/shop");
  return { ok: true };
}

export async function deleteRewardAction(id: string): Promise<RewardFormState> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reward_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/rewards");
  revalidatePath("/shop");
  return { ok: true };
}
