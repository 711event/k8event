"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";
import { getGroupId } from "@/lib/get-group";

// ── Approve referral (create player account + link referral) ──────────────────

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  return pw;
}

const approveSchema = z.object({
  requestId: z.string().uuid(),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, digits, underscore only"),
  displayName: z.string().trim().max(60).optional(),
});

export type ApproveState =
  | { ok: true; username: string; password: string }
  | { error: string }
  | undefined;

export async function approveReferralAction(
  _prev: ApproveState,
  formData: FormData,
): Promise<ApproveState> {
  await requireRole("admin");

  const parsed = approveSchema.safeParse({
    requestId:   formData.get("requestId"),
    username:    formData.get("username"),
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { requestId, username, displayName } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const admin = getSupabaseAdmin();
  const groupId = getGroupId();

  // Verify request belongs to this group and is still pending
  const { data: req } = await supabase
    .from("referral_requests")
    .select("id, referrer_id, status")
    .eq("id", requestId)
    .eq("group_id", groupId)
    .eq("status", "pending")
    .maybeSingle();

  if (!req) return { error: "Request not found or already processed" };

  const password = generatePassword();
  const emailDomain = process.env.PLAYER_EMAIL_DOMAIN ?? "k8event.local";
  const email = `${username}@${emailDomain}`;

  // Create auth user
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: displayName ?? username },
  });
  if (authErr || !created.user) {
    const msg = authErr?.message ?? "Could not create auth user";
    if (/already/i.test(msg)) return { error: `Username "${username}" is already taken` };
    return { error: msg };
  }

  // Create profile with referred_by
  const { error: profErr } = await admin.from("profiles").insert({
    user_id:     created.user.id,
    role:        "player",
    username,
    display_name: displayName ?? username,
    group_id:    groupId,
    referred_by: req.referrer_id ?? null,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return { error: profErr.message };
  }

  // Mark request as approved
  await admin
    .from("referral_requests")
    .update({ status: "approved", player_id: created.user.id })
    .eq("id", requestId);

  // If trigger = on_register, award now
  const { data: refSettings } = await supabase
    .from("referral_settings")
    .select("trigger_type, referrer_token_reward, enabled")
    .eq("group_id", groupId)
    .maybeSingle();

  if (
    refSettings?.enabled &&
    refSettings?.trigger_type === "on_register" &&
    req.referrer_id
  ) {
    await admin.from("token_transactions").insert({
      player_id: req.referrer_id,
      delta:     refSettings.referrer_token_reward,
      reason:    "referral",
      note:      `Referral reward — friend ${created.user.id} joined`,
    });
    await admin
      .from("referral_requests")
      .update({ referrer_rewarded: true })
      .eq("id", requestId);
  }

  revalidatePath("/admin/referrals");
  revalidatePath("/admin/players");
  return { ok: true, username, password };
}


// ── Reject referral request ───────────────────────────────────────────────────

export async function rejectReferralAction(requestId: string): Promise<{ error?: string }> {
  await requireRole("admin");
  const admin = getSupabaseAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: req } = await supabase
    .from("referral_requests")
    .select("id")
    .eq("id", requestId)
    .eq("group_id", getGroupId())
    .maybeSingle();

  if (!req) return { error: "Not found" };

  await admin
    .from("referral_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);

  revalidatePath("/admin/referrals");
  return {};
}


// ── Save referral settings ────────────────────────────────────────────────────

const settingsSchema = z.object({
  enabled:               z.boolean(),
  trigger_type:          z.enum(["on_register", "on_first_recharge", "on_min_recharge"]),
  min_recharge_amount:   z.number().int().min(0),
  referrer_token_reward: z.number().int().min(0),
  share_mode:            z.enum(["link_only", "link_and_card"]),
  share_message:         z.string().max(500).optional().nullable(),
});

export async function saveReferralSettingsAction(
  data: z.infer<typeof settingsSchema>
): Promise<{ error?: string }> {
  await requireRole("admin");
  const parsed = settingsSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("referral_settings")
    .upsert({ group_id: getGroupId(), ...parsed.data }, { onConflict: "group_id" });

  if (error) return { error: error.message };
  revalidatePath("/admin/referrals");
  return {};
}
