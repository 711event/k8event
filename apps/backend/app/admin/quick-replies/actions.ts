"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";

const qrSchema = z.object({
  title: z.string().regex(/^\+\+[A-Z0-9_]+$/, "Title must look like ++MY_TAG"),
  body: z.string().min(1).max(2000),
});

export type QRState = { ok: true } | { error: string } | undefined;

export async function createQuickReplyAction(
  _prev: QRState,
  formData: FormData,
): Promise<QRState> {
  await requireRole("admin");
  const parsed = qrSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("quick_replies").insert({
    title: parsed.data.title,
    body: parsed.data.body,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { error: "Title already exists" };
    return { error: error.message };
  }
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
