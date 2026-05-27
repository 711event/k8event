"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";
import { getGroupId } from "@/lib/get-group";

const schema = z.object({
  name:         z.string().trim().min(1, "Name is required").max(60),
  phone:        z.string().trim().min(5, "Phone is required").max(30),
  ref_username: z.string().trim().min(1).max(64),
});

export type JoinState =
  | { ok: true }
  | { error: string }
  | undefined;

export async function submitJoinRequestAction(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const parsed = schema.safeParse({
    name:         formData.get("name"),
    phone:        formData.get("phone"),
    ref_username: formData.get("ref_username"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, phone, ref_username } = parsed.data;
  const admin = getSupabaseAdmin();
  const groupId = getGroupId();

  // Resolve referrer
  const { data: referrer } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", ref_username)
    .eq("group_id", groupId)
    .eq("role", "player")
    .maybeSingle();

  // Insert request (even if referrer not found — admin will see it)
  const { error } = await admin.from("referral_requests").insert({
    group_id:    groupId,
    name,
    phone,
    ref_username,
    referrer_id: referrer?.user_id ?? null,
    status:      "pending",
  });

  if (error) return { error: "提交失败，请稍后再试。" };
  return { ok: true };
}
