import { redirect } from "next/navigation";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";
import { getFeLocale } from "@/lib/get-locale";
import { tFe } from "@/lib/i18n";
import { getGroupBranding } from "@/lib/get-branding";
import { ReferralClient } from "./ReferralClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "邀请好友 · 711event" };

// Build the public join URL for this deployment.
// Priority: explicit env > VERCEL_PROJECT_PRODUCTION_URL (stable prod domain) > VERCEL_URL (preview, avoid)
function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;
  if (url) return url.startsWith("http") ? url : `https://${url}`;
  return "https://711event.vercel.app";
}

export default async function ReferralPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getFeLocale();
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);
  const supabase = await createSupabaseServerClient();
  const branding = await getGroupBranding();
  const groupId = getGroupId();

  // Fetch referral settings
  const { data: settings } = await supabase
    .from("referral_settings")
    .select("enabled, trigger_type, min_recharge_amount, referrer_token_reward, share_mode, share_message")
    .eq("group_id", groupId)
    .maybeSingle();

  const isEnabled = settings?.enabled ?? true;
  const triggerType = settings?.trigger_type ?? "on_first_recharge";
  const minRecharge = settings?.min_recharge_amount ?? 0;
  const referrerReward = settings?.referrer_token_reward ?? 50;
  const showCard = (settings?.share_mode ?? "link_and_card") === "link_and_card";
  const shareMessage = settings?.share_message ?? null;

  // Referral stats
  const { data: requests } = await supabase
    .from("referral_requests")
    .select("id, name, status, referrer_rewarded, created_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const approved = (requests ?? []).filter((r) => r.status === "approved");
  const rewarded = approved.filter((r) => r.referrer_rewarded);
  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const totalTokens = rewarded.length * referrerReward;

  const baseUrl = getBaseUrl();
  const referralUrl = `${baseUrl}/join?ref=${user.username}`;

  // Build trigger description string
  function triggerDesc() {
    if (triggerType === "on_register") return t("referral_trigger_register");
    if (triggerType === "on_min_recharge")
      return t("referral_trigger_min_recharge", { amount: minRecharge });
    return t("referral_trigger_first_recharge");
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="text-center space-y-1.5 pt-2">
        <div className="text-4xl">🎁</div>
        <h1 className="text-2xl font-bold text-[var(--text-hi)]">{t("referral_title")}</h1>
        <p className="text-sm text-[var(--text-mid)]">{t("referral_subtitle")}</p>
      </div>

      {/* Reward rule + stats */}
      <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--text-lo)] uppercase tracking-wider">{t("referral_rule_label")}</p>
        <div className="flex items-center justify-center gap-2">
          <div className="text-center px-4">
            <div className="text-2xl font-bold text-[var(--gold-300)]">+{referrerReward}</div>
            <div className="text-xs text-[var(--text-lo)] mt-0.5">{t("referral_you_get")}</div>
          </div>
        </div>
        <p className="text-xs text-center text-[var(--text-lo)]">{triggerDesc()}</p>
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--border-subtle)]">
          <div className="text-center">
            <div className="text-lg font-bold text-[var(--text-hi)]">{approved.length}</div>
            <div className="text-[10px] text-[var(--text-lo)]">{t("referral_stat_approved")}</div>
          </div>
          <div className="text-center border-x border-[var(--border-subtle)]">
            <div className="text-lg font-bold text-[var(--gold-300)]">{totalTokens}</div>
            <div className="text-[10px] text-[var(--text-lo)]">{t("referral_stat_tokens")}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[var(--text-hi)]">{pending.length}</div>
            <div className="text-[10px] text-[var(--text-lo)]">{t("referral_stat_pending")}</div>
          </div>
        </div>
      </div>

      {/* Share UI */}
      {isEnabled ? (
        <ReferralClient
          referralUrl={referralUrl}
          username={user.username ?? user.id}
          companyName={branding.company_name}
          showCard={showCard}
          shareMessage={shareMessage}
          locale={locale}
        />
      ) : (
        <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] p-6 text-center">
          <p className="text-sm text-[var(--text-mid)]">{t("referral_disabled")}</p>
        </div>
      )}

      {/* History */}
      {(requests ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-lo)] uppercase tracking-wider px-1">
            {t("referral_history_label")}
          </p>
          {(requests ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-hi)]">{r.name}</p>
                <p className="text-xs text-[var(--text-lo)] mt-0.5">
                  {r.status === "pending"
                    ? `⏳ ${t("referral_status_pending")}`
                    : r.status === "rejected"
                      ? `✕ ${t("referral_status_rejected")}`
                      : r.referrer_rewarded
                        ? `✓ ${t("referral_status_rewarded")}`
                        : `⏳ ${t("referral_status_waiting_recharge")}`}
                </p>
              </div>
              {r.referrer_rewarded && (
                <span className="text-sm font-bold text-[var(--pitch-400)]">+{referrerReward} 🪙</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
