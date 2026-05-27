import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";
import { tFe, type FeLocale } from "@/lib/i18n";
import { getGroupBranding } from "@/lib/get-branding";
import { JoinForm } from "./JoinForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  searchParams: Promise<{ ref?: string; lang?: string }>;
}) {
  const { lang } = await props.searchParams;
  const locale: FeLocale = lang === "zh" ? "zh" : lang === "en" ? "en" : "ms";
  const branding = await getGroupBranding();
  const supabase = await createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("referral_settings")
    .select("og_image_url")
    .eq("group_id", getGroupId())
    .maybeSingle();
  const ogImage = settings?.og_image_url ?? null;

  const t = (k: Parameters<typeof tFe>[1]) => tFe(locale, k);

  return {
    title: locale === "zh"
      ? `加入 ${branding.company_name}`
      : locale === "en"
      ? `Join ${branding.company_name}`
      : `Sertai ${branding.company_name}`,
    openGraph: {
      title: locale === "zh"
        ? `加入 ${branding.company_name} — 天天签到赢 Token`
        : locale === "en"
        ? `Join ${branding.company_name} — Daily Check-in to Win Tokens`
        : `Sertai ${branding.company_name} — Daftar Masuk Harian untuk Menang Token`,
      description: t("join_hero_sub"),
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
  };
}

export default async function JoinPage(props: {
  searchParams: Promise<{ ref?: string; lang?: string }>;
}) {
  const { ref, lang } = await props.searchParams;

  // Default locale is Malay (ms). URL param ?lang= overrides.
  const locale: FeLocale = lang === "zh" ? "zh" : lang === "en" ? "en" : "ms";
  const t = (k: Parameters<typeof tFe>[1]) => tFe(locale, k);
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

  // Fetch referral settings
  const { data: settings } = await supabase
    .from("referral_settings")
    .select("enabled, referrer_token_reward")
    .eq("group_id", getGroupId())
    .maybeSingle();

  const isEnabled = settings?.enabled ?? true;

  // Build lang-switcher URLs
  const basePath = refUsername ? `/join?ref=${encodeURIComponent(refUsername)}` : "/join";
  const langUrls = {
    ms: `${basePath}&lang=ms`,
    en: `${basePath}&lang=en`,
    zh: `${basePath}&lang=zh`,
  };

  return (
    <div data-theme="player" className="min-h-screen bg-[var(--bg-base)] text-[var(--text-hi)]">
      <div className="max-w-sm mx-auto px-4 py-8 space-y-5">

        {/* Language switcher — top right */}
        <div className="flex justify-end">
          <div className="flex items-center gap-0.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1">
            {(["ms", "en", "zh"] as const).map((l) => (
              <a
                key={l}
                href={langUrls[l]}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  locale === l
                    ? "bg-[var(--gold-500)] text-[var(--text-on-gold)]"
                    : "text-[var(--text-lo)] hover:text-[var(--text-mid)]"
                }`}
              >
                {l === "ms" ? "BM" : l === "en" ? "EN" : "中文"}
              </a>
            ))}
          </div>
        </div>

        {/* Brand hero */}
        <div className="text-center space-y-2 pt-2 pb-2">
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
            </div>
          </div>
        )}

        {/* Perks */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "📅", title: t("join_perk_checkin_title"), body: t("join_perk_checkin_body") },
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
          <JoinForm refUsername={refUsername} locale={locale} langUrls={langUrls} />
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
