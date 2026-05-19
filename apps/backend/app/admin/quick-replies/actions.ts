"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";

const qrSchema = z.object({
  title: z.string().trim().min(1, "请填写标题").max(80, "标题最多 80 字"),
  body: z.string().min(1, "请填写内容").max(2000, "内容最多 2000 字"),
  sort_order: z.coerce.number().int().min(-9999).max(9999).default(0),
  is_active: z.coerce.boolean().default(true),
});

export type QRState = { ok: true } | { error: string } | undefined;

function parseForm(formData: FormData) {
  return qrSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    sort_order: formData.get("sort_order") ?? 0,
    // checkbox value: "on" when checked, absent otherwise → coerce to boolean via presence
    is_active: formData.get("is_active") === null ? false : true,
  });
}

export async function createQuickReplyAction(
  _prev: QRState,
  formData: FormData,
): Promise<QRState> {
  await requireRole("admin");
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("quick_replies").insert({
    title: parsed.data.title,
    body: parsed.data.body,
    sort_order: parsed.data.sort_order,
    is_active: parsed.data.is_active,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { error: "标题已存在" };
    return { error: error.message };
  }
  revalidatePath("/admin/quick-replies");
  return { ok: true };
}

export async function updateQuickReplyAction(
  id: string,
  _prev: QRState,
  formData: FormData,
): Promise<QRState> {
  await requireRole("admin");
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("quick_replies")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      sort_order: parsed.data.sort_order,
      is_active: parsed.data.is_active,
    })
    .eq("id", id);
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { error: "标题已存在" };
    return { error: error.message };
  }
  revalidatePath("/admin/quick-replies");
  return { ok: true };
}

export async function toggleQuickReplyAction(id: string, nextActive: boolean): Promise<QRState> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("quick_replies")
    .update({ is_active: nextActive })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/quick-replies");
  return { ok: true };
}

export async function deleteQuickReplyAction(id: string): Promise<QRState> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("quick_replies").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/quick-replies");
  return { ok: true };
}
