"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";
import { getGroupId } from "@/lib/get-group";

const JOIN_COOKIE = "k8e_join_guest";
const ONE_YEAR = 60 * 60 * 24 * 365;

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(60)
    .regex(/^[a-zA-Z\s]+$/, "Name must contain letters only (no numbers or special characters)"),
  phone: z
    .string()
    .trim()
    .min(5, "Phone is required")
    .max(30)
    .regex(/^0/, "Phone number must start with 0"),
  ref_username: z.string().trim().min(1).max(64),
});

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 10; i++)
    pw += chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  return pw;
}


export type JoinState =
  | { ok: true; threadId: string; guestToken: string; guestName: string; credentials?: { username: string; password: string; loginUrl: string } }
  | { error: string }
  | undefined;

export async function submitJoinRequestAction(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  // Read locale so credentials message is in the member's chosen language
  const rawLocale = formData.get("locale");
  const locale = rawLocale === "zh" ? "zh" : rawLocale === "en" ? "en" : "ms";

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

  // Check auto_approve setting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: refSettings } = await (admin as any)
    .from("referral_settings")
    .select("auto_approve, username_prefix, trigger_type, referrer_token_reward, enabled")
    .eq("group_id", groupId)
    .maybeSingle();

  const autoApprove = refSettings?.auto_approve === true;
  const usernamePrefix: string = (refSettings?.username_prefix ?? "").toUpperCase();

  // Dedup: if there's already a pending request for this phone in this group,
  // reuse its chat thread so the applicant reconnects to the existing conversation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("referral_requests")
    .select("id, chat_thread_id")
    .eq("group_id", groupId)
    .eq("phone", phone)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.chat_thread_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: th } = await (admin as any)
      .from("chat_threads")
      .select("guest_session")
      .eq("id", existing.chat_thread_id)
      .maybeSingle();

    if (th?.guest_session) {
      const cookieStore = await cookies();
      cookieStore.set(JOIN_COOKIE, th.guest_session, {
        httpOnly: true, sameSite: "lax", path: "/", maxAge: ONE_YEAR,
      });
      return { ok: true, threadId: existing.chat_thread_id, guestToken: th.guest_session, guestName: name };
    }
  }

  // Resolve referrer
  const { data: referrer } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", ref_username)
    .eq("group_id", groupId)
    .eq("role", "player")
    .maybeSingle();

  // Create a guest chat thread for the applicant
  const guestToken = randomUUID();
  const guestName = name;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: thread, error: threadErr } = await (admin as any)
    .from("chat_threads")
    .insert({
      guest_session: guestToken,
      guest_name: guestName,
      group_id: groupId,
    })
    .select("id")
    .single();

  if (threadErr || !thread) {
    return { error: "提交失败，请稍后再试。" };
  }

  const threadId: string = thread.id;
  const now = new Date().toISOString();

  // Insert referral request (linked to chat thread)
  const { data: reqRow, error: reqErr } = await admin
    .from("referral_requests")
    .insert({
      group_id:       groupId,
      name,
      phone,
      ref_username,
      referrer_id:    referrer?.user_id ?? null,
      status:         "pending",
      chat_thread_id: threadId,
    })
    .select("id")
    .single();

  if (reqErr || !reqRow) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("chat_threads").delete().eq("id", threadId);
    return { error: "提交失败，请稍后再试。" };
  }

  // ── Auto-approve path ──────────────────────────────────────────────────────
  if (autoApprove) {
    const password = generatePassword();
    const emailDomain = process.env.PLAYER_EMAIL_DOMAIN ?? "k8event.local";

    // Generate sequential username: {PREFIX}{00001}
    // Find the current max sequence number for this prefix in the group.
    const likePattern = `${usernamePrefix}%`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingUsers } = await (admin as any)
      .from("profiles")
      .select("username")
      .eq("group_id", groupId)
      .like("username", likePattern);

    const prefixLen = usernamePrefix.length;
    const existingNumbers = ((existingUsers ?? []) as { username: string | null }[])
      .map((r) => r.username?.slice(prefixLen) ?? "")
      .filter((s) => /^\d+$/.test(s))
      .map((s) => parseInt(s, 10))
      .filter((n) => !isNaN(n));

    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    const username = `${usernamePrefix}${String(nextNum).padStart(5, "0")}`;

    const email = `${username}@${emailDomain}`;

    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, display_name: name },
    });

    if (!authErr && created?.user) {
      // Create profile (include phone from referral request)
      await admin.from("profiles").insert({
        user_id:      created.user.id,
        role:         "player",
        username,
        display_name: name,
        group_id:     groupId,
        referred_by:  referrer?.user_id ?? null,
        phone,
      });

      // Mark request approved
      await admin
        .from("referral_requests")
        .update({ status: "approved", player_id: created.user.id })
        .eq("id", reqRow.id);

      // Link the join-flow chat thread to the new player so that when they log in
      // and open /livechat the guest route finds this thread (by player_id) and
      // reuses it instead of creating a new one. Also set guest_name = username
      // so the admin inbox shows RR00003 instead of the applicant's real name.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from("chat_threads")
        .update({ player_id: created.user.id, guest_name: username })
        .eq("id", threadId);

      // Award on_register referral tokens if applicable
      if (
        refSettings?.enabled &&
        refSettings?.trigger_type === "on_register" &&
        referrer?.user_id
      ) {
        await admin.from("token_transactions").insert({
          player_id: referrer.user_id,
          delta:     refSettings.referrer_token_reward,
          reason:    "referral",
          note:      `Auto-approved referral — new player ${created.user.id}`,
        });
        await admin
          .from("referral_requests")
          .update({ referrer_rewarded: true })
          .eq("id", reqRow.id);
      }

      // Send formatted credentials to the chat thread (locale-aware)
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
      const loginUrl = `${siteUrl}/login`;
      const credMsg = locale === "zh"
        ? `✅ 您的账户已成功激活！\n\n请查看您的账户资料并尝试登录。\n\n🌐 ${loginUrl}\n🔑 用户名: ${username}\n🔒 密码: ${password}\n\n如有疑问，请在此聊天室联系客服。`
        : locale === "en"
        ? `✅ Your account has been successfully activated!\n\nPlease check your account details and log in.\n\n🌐 ${loginUrl}\n🔑 Username: ${username}\n🔒 Password: ${password}\n\nIf you have any questions, please contact us here.`
        : `✅ Akaun anda telah berjaya diaktifkan!\n\nSila semak butiran akaun anda dan cuba log masuk.\n\n🌐 ${loginUrl}\n🔑 Nama pengguna: ${username}\n🔒 Kata laluan: ${password}\n\nJika anda ada sebarang soalan, sila hubungi kami di sini.`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("chat_messages").insert({
        thread_id: threadId,
        sender:    "system",
        kind:      "text",
        body:      credMsg,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from("chat_threads")
        .update({ last_message_at: now })
        .eq("id", threadId);

      // Set cookie and return credentials for the JoinWaiting card
      const cookieStore2 = await cookies();
      cookieStore2.set(JOIN_COOKIE, guestToken, {
        httpOnly: true, sameSite: "lax", path: "/", maxAge: ONE_YEAR,
      });
      return { ok: true, threadId, guestToken, guestName, credentials: { username, password, loginUrl } };
    } else {
      // Auth user creation failed — fall through to manual review with a note
      const waitMsg = locale === "zh"
        ? `👋 你好 ${name}！你的申请已收到，客服稍后将审核并在这里发送你的登入账号。`
        : locale === "en"
        ? `👋 Hi ${name}! Your application has been received. Our team will review it and send your login details here shortly.`
        : `👋 Hai ${name}! Permohonan anda telah diterima. Pasukan kami akan menyemak dan menghantar butiran log masuk anda di sini tidak lama lagi.`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("chat_messages").insert({
        thread_id: threadId,
        sender:    "system",
        kind:      "text",
        body:      waitMsg,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from("chat_threads")
        .update({ last_message_at: now })
        .eq("id", threadId);
    }
  } else {
    // ── Manual review path ────────────────────────────────────────────────────
    const waitMsg = locale === "zh"
      ? `👋 你好 ${name}！你的申请已收到，客服稍后将审核并在这里发送你的登入账号。`
      : locale === "en"
      ? `👋 Hi ${name}! Your application has been received. Our team will review it and send your login details here shortly.`
      : `👋 Hai ${name}! Permohonan anda telah diterima. Pasukan kami akan menyemak dan menghantar butiran log masuk anda di sini tidak lama lagi.`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("chat_messages").insert({
      thread_id: threadId,
      sender:    "system",
      kind:      "text",
      body:      waitMsg,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("chat_threads")
      .update({ last_message_at: now })
      .eq("id", threadId);
  }

  // Set join-guest cookie so JoinWaiting can send messages via /api/chat/send-join
  const cookieStore = await cookies();
  cookieStore.set(JOIN_COOKIE, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    path:     "/",
    maxAge:   ONE_YEAR,
  });

  return { ok: true, threadId, guestToken, guestName };
}
