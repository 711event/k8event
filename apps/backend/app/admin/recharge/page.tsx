import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { malaysiaDateString } from "@k8event/shared/time/malaysia";
import { RechargeImporter } from "./RechargeImporter";

export const metadata = { title: "充值导入 · 管理后台" };

export default async function RechargePage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : malaysiaDateString();
  const supabase = await createSupabaseServerClient();

  const { data: todays } = await supabase
    .from("daily_recharge")
    .select(
      "amount, player:profiles!daily_recharge_player_id_fkey(username, display_name)",
    )
    .eq("recharge_date", date)
    .order("amount", { ascending: false });

  const eligibleCount = (todays ?? []).filter((r) => Number(r.amount) >= 500).length;

  return (
    <div className="space-y-8 max-w-5xl">
      <h1 className="text-2xl font-semibold">Daily recharge import</h1>

      <section className="rounded-lg border border-zinc-200 p-5 space-y-2">
        <h2 className="text-lg font-medium">Import CSV / Excel</h2>
        <p className="text-sm text-zinc-500">
          支持两种格式：
        </p>
        <ul className="text-sm text-zinc-500 list-disc list-inside space-y-0.5">
          <li>
            <strong>Excel (.xlsx)</strong>：列名需含 <code>Date</code>、<code>Superid</code>、<code>In</code>（其余列自动忽略）
          </li>
          <li>
            <strong>CSV</strong>：列顺序 <code>date, username, amount</code>（header 行可选）
          </li>
        </ul>
        <p className="text-sm text-zinc-500">
          日期均以 GMT+8 解析。同一 (玩家, 日期) 已有记录将被覆盖。
        </p>
        <RechargeImporter />
      </section>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200">
          <h2 className="text-lg font-medium">Recharges for {date}</h2>
          <span className="text-sm text-zinc-500">
            {todays?.length ?? 0} rows · {eligibleCount} eligible (≥ 500)
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Player</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Eligible?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {!todays?.length ? (
              <tr><td colSpan={3} className="px-4 py-6 text-zinc-500">No recharges for this date.</td></tr>
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
                        {eligible ? "yes" : "no"}
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
