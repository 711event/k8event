import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { ApproveForm } from "./ApproveForm";
import { ReferralSettingsForm } from "./ReferralSettingsForm";

export const dynamic = "force-dynamic";

export default async function ReferralsPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireRole("admin");
  const { tab = "pending" } = await props.searchParams;
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1], v?: Parameters<typeof tBo>[2]) => tBo(locale, k, v);
  const supabase = await createSupabaseServerClient();
  const groupId = getGroupId();

  // Fetch pending requests
  const { data: pendingRequests } = await supabase
    .from("referral_requests")
    .select("id, name, phone, ref_username, referrer_id, created_at")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  // Fetch processed requests (approved + rejected)
  const { data: processedRequests } = await supabase
    .from("referral_requests")
    .select("id, name, phone, ref_username, status, referrer_rewarded, created_at, player_id, profiles!referral_requests_player_id_fkey(username)")
    .eq("group_id", groupId)
    .in("status", ["approved", "rejected"])
    .order("created_at", { ascending: false })
    .limit(100);

  // Stats
  const totalPending = pendingRequests?.length ?? 0;
  const totalApproved = processedRequests?.filter((r) => r.status === "approved").length ?? 0;
  const totalRewarded = processedRequests?.filter((r) => r.referrer_rewarded).length ?? 0;

  // Referral settings
  const { data: settings } = await supabase
    .from("referral_settings")
    .select("enabled, trigger_type, min_recharge_amount, referrer_token_reward, share_mode, share_message_zh, share_message_en, share_message_ms")
    .eq("group_id", groupId)
    .maybeSingle();

  const settingsData = {
    enabled: settings?.enabled ?? true,
    trigger_type: (settings?.trigger_type ?? "on_first_recharge") as "on_register" | "on_first_recharge" | "on_min_recharge",
    min_recharge_amount: settings?.min_recharge_amount ?? 0,
    referrer_token_reward: settings?.referrer_token_reward ?? 50,
    share_mode: (settings?.share_mode ?? "link_and_card") as "link_only" | "link_and_card",
    share_message_zh: settings?.share_message_zh ?? null,
    share_message_en: settings?.share_message_en ?? null,
    share_message_ms: settings?.share_message_ms ?? null,
  };

  const tabs = [
    { key: "pending", label: t("referral_tab_pending"), count: totalPending },
    { key: "history", label: t("referral_tab_history") },
    { key: "settings", label: t("referral_tab_settings") },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900">{t("referral_page_title")}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{t("referral_page_subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{totalPending}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{t("referral_stat_pending")}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{totalApproved}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{t("referral_stat_approved")}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-amber-600">{totalRewarded}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{t("referral_stat_rewarded")}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200">
        {tabs.map((tb) => (
          <a
            key={tb.key}
            href={`?tab=${tb.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === tb.key
                ? "border-amber-500 text-amber-700"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tb.label}
            {"count" in tb && (tb.count ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {tb.count}
              </span>
            )}
          </a>
        ))}
      </div>

      {/* Tab: Pending */}
      {tab === "pending" && (
        <div>
          {!pendingRequests?.length ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              {t("referral_pending_empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-zinc-900">{req.name}</p>
                      <p className="text-xs text-zinc-500">📞 {req.phone}</p>
                      <p className="text-xs text-zinc-500">
                        🔗 {t("referral_referred_by")}: <span className="font-medium text-zinc-700">{req.ref_username}</span>
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {formatMalaysia(req.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                      {t("referral_status_pending")}
                    </span>
                  </div>
                  <ApproveForm
                    requestId={req.id}
                    suggestedUsername={req.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: History */}
      {tab === "history" && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          {!processedRequests?.length ? (
            <div className="p-8 text-center text-sm text-zinc-500">{t("referral_history_empty")}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-600">{t("referral_col_name")}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-600">{t("referral_col_phone")}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-600">{t("referral_col_referrer")}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-600">{t("referral_col_player")}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-600">{t("referral_col_status")}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-600">{t("referral_col_rewarded")}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-600">{t("referral_col_time")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {processedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5 font-medium text-zinc-800">{req.name}</td>
                    <td className="px-4 py-2.5 text-zinc-600">{req.phone}</td>
                    <td className="px-4 py-2.5 text-zinc-600">{req.ref_username}</td>
                    <td className="px-4 py-2.5 text-zinc-600">
                      {(req.profiles as { username?: string } | null)?.username ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        req.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {req.status === "approved" ? t("referral_status_approved") : t("referral_status_rejected")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {req.status === "approved" ? (
                        req.referrer_rewarded
                          ? <span className="text-xs text-emerald-700 font-medium">✓ {t("referral_rewarded_yes")}</span>
                          : <span className="text-xs text-zinc-400">{t("referral_rewarded_no")}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-400">
                      {formatMalaysia(req.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Settings */}
      {tab === "settings" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 max-w-lg">
          <h2 className="text-sm font-semibold text-zinc-800 mb-4">{t("referral_settings_title")}</h2>
          <ReferralSettingsForm initial={settingsData} />
        </div>
      )}
    </div>
  );
}
