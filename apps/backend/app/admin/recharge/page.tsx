import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { RechargeImporter } from "./RechargeImporter";

export const metadata = { title: "Recharge Import · Admin Panel" };

export default async function RechargePage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireRole("admin");
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const sp = await props.searchParams;
  // Default to yesterday (GMT+8) — daily imports are always for the prior day
  const yesterday = new Date(Date.now() + 8 * 3_600_000 - 86_400_000).toISOString().slice(0, 10);
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : yesterday;
  const supabase = await createSupabaseServerClient();

  const { data: todays } = await supabase
    .from("daily_recharge")
    .select(
      "amount, player:profiles!daily_recharge_player_id_fkey(username, display_name)",
    )
    .eq("recharge_date", date)
    .order("amount", { ascending: false });

  const eligibleCount = (todays ?? []).filter((r) => Number(r.amount) >= 500).length;

  // Split "Bold: rest" from tip strings
  const tipPasteParts = t("recharge_tip_paste").split(/：|: (.+)/).filter(Boolean);
  const tipExcelParts = t("recharge_tip_excel").split(/：|: (.+)/).filter(Boolean);

  return (
    <div className="space-y-8 max-w-5xl">
      <h1 className="text-2xl font-semibold">{t("recharge_title")}</h1>

      <section className="rounded-lg border border-zinc-200 p-5 space-y-2">
        <h2 className="text-lg font-medium">{t("recharge_import_title")}</h2>
        <ul className="text-sm text-zinc-500 list-disc list-inside space-y-0.5">
          <li>
            <strong>{tipPasteParts[0]}</strong>
            {locale === "zh" ? "：" : ": "}
            {tipPasteParts.slice(1).join("")}
          </li>
          <li>
            <strong>{tipExcelParts[0]}</strong>
            {locale === "zh" ? "：" : ": "}
            {tipExcelParts.slice(1).join("")}
          </li>
        </ul>
        <p className="text-sm text-zinc-500">
          {t("recharge_tip_date")}
        </p>
        <RechargeImporter />
      </section>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200">
          <h2 className="text-lg font-medium">{t("recharge_today_title", { date })}</h2>
          <span className="text-sm text-zinc-500">
            {t("recharge_today_count", { count: todays?.length ?? 0, eligible: eligibleCount })}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{t("recharge_col_player")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("recharge_col_amount")}</th>
              <th className="px-4 py-3 font-medium">{t("recharge_col_qualified")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {!todays?.length ? (
              <tr><td colSpan={3} className="px-4 py-6 text-zinc-500">{t("recharge_no_records")}</td></tr>
            ) : (
              todays.map((r, i) => {
                const player = Array.isArray(r.player) ? r.player[0] : r.player;
                const eligible = Number(r.amount) >= 500;
                return (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      {player?.display_name ?? "—"}{" "}
                      <span className="text-zinc-500 font-mono">({player?.username})</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(r.amount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " +
                          (eligible
                            ? "bg-green-500/15 text-green-600"
                            : "bg-zinc-500/15 text-zinc-500")
                        }
                      >
                        {eligible ? t("recharge_qualified") : t("recharge_not_qualified")}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
