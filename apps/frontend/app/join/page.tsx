import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";
import { getFeLocale } from "@/lib/get-locale";
import { tFe } from "@/lib/i18n";
import { getGroupBranding } from "@/lib/get-branding";
import { JoinForm } from "./JoinForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const branding = await getGroupBranding();
  const supabase = await createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("referral_settings")
    .select("og_image_url")
    .eq("group_id", getGroupId())
    .maybeSingle();
  const ogImage = settings?.og_image_url ?? null;
  return {
    title: `加入 ${branding.company_name}`,
    openGraph: {
      title: `加入 ${branding.company_name} — 天天签到赢 Token`,
      description: "每日签到赢 Token，连续签到有翻倍奖励！点链接立即加入。",
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: `加入 ${branding.company_name}`,
      description: "每日签到赢 Token，连续签到有翻倍奖励！",
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function JoinPage(props: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await props.searchParams;
  const locale = await getFeLocale();
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);
  const branding = await getGroupBranding();
  const supabase = await createSupabaseServerClient();

  // Verify referrer exists in this group
  const refUsername = ref ?? "";
  let referrerDisplay: string | null = null;
  if (refUsername) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("username", refUsername)
      .eq("group_id", getGroupId())
      .eq("role", "player")
      .maybeSingle();
    referrerDisplay = data?.display_name ?? data?.username ?? null;
  }

  // Fetch referral settings (to check if referral is enabled + share_mode)
  const { data: settings } = await supabase
    .from("referral_settings")
    .select("enabled, referrer_token_reward")
    .eq("group_id", getGroupId())
    .maybeSingle();

  const isEnabled = settings?.enabled ?? true;
  const referrerReward = settings?.referrer_token_reward ?? 50;

  return (
    <div data-theme="player" className="min-h-screen bg-[var(--bg-base)] text-[var(--text-hi)]">
      <div className="max-w-sm mx-auto px-4 py-8 space-y-5">

        {/* Brand hero */}
        <div className="text-center space-y-2 pt-4 pb-2">
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={branding.company_name} className="h-12 w-auto object-contain mx-auto" />
          ) : (
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--gold-300)] to-[var(--gold-600)] font-bold text-[var(--text-on-gold)] text-lg mx-auto">
              711
            </div>
          )}
          <h1 className="text-2xl font-bold text-[var(--text-hi)]">{branding.company_name}</h1>
          <p className="text-sm text-[var(--text-lo)]">{t("join_hero_sub")}</p>
        </div>

        {/* Invited by banner */}
        {referrerDisplay && (
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--gold-500)]/10 border border-[var(--gold-500)]/30 px-4 py-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--gold-300)] to-[var(--gold-600)] flex items-center justify-center font-bold text-[var(--text-on-gold)] text-sm flex-shrink-0">
              {referrerDisplay[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-hi)] truncate">
                {referrerDisplay} {t("join_invite_banner_msg")}
              </p>
              <p className="text-xs text-[var(--gold-400)]">
                {t("join_invite_welcome_tokens", { n: referrerReward })}
              </p>
            </div>
          </div>
        )}

        {/* Perks */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🔥", title: t("join_perk_streak_title"), body: t("join_perk_streak_body") },
            { icon: "📅", title: t("join_perk_checkin_title"), body: t("join_perk_checkin_body") },
            { icon: "🪙", title: t("join_perk_token_title"), body: t("join_perk_token_body") },
            { icon: "🎁", title: t("join_perk_reward_title"), body: t("join_perk_reward_body") },
          ].map((p) => (
            <div key={p.title} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] p-3 space-y-1">
              <div className="text-xl">{p.icon}</div>
              <div className="text-xs font-semibold text-[var(--text-hi)]">{p.title}</div>
              <div className="text-xs text-[var(--text-lo)] leading-snug">{p.body}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        {isEnabled && refUsername ? (
          <JoinForm refUsername={refUsername} locale={locale} />
        ) : !refUsername ? (
          <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] p-6 text-center space-y-2">
            <div className="text-3xl">🔗</div>
            <p className="text-sm text-[var(--text-mid)]">{t("join_no_ref_msg")}</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] p-6 text-center space-y-2">
            <p className="text-sm text-[var(--text-mid)]">{t("join_disabled_msg")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
