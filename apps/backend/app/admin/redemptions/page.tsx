import Link from "next/link";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { getGroupPlayerIds } from "@/lib/get-group";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { RedemptionActions } from "./RedemptionActions";
import type { RedemptionStatus } from "@k8event/shared/supabase/types";

export const metadata = { title: "Redemptions · Admin Panel" };

const STATUS_COLOR: Record<RedemptionStatus, string> = {
  pending:   "bg-amber-500/15 text-amber-600",
  approved:  "bg-blue-500/15 text-blue-600",
  fulfilled: "bg-green-500/15 text-green-600",
  rejected:  "bg-red-500/15 text-red-600",
};

export default async function RedemptionsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("admin");
  const locale = await getBoLocale();

  const tabs: { key: RedemptionStatus | "all"; label: string }[] = [
    { key: "pending",   label: tBo(locale, "redemption_status_pending") },
    { key: "approved",  label: tBo(locale, "redemption_status_approved") },
    { key: "fulfilled", label: tBo(locale, "redemption_status_fulfilled") },
    { key: "rejected",  label: tBo(locale, "redemption_status_rejected") },
    { key: "all",       label: tBo(locale, "redemption_status_all") },
  ];

  const STATUS_LABEL: Record<RedemptionStatus, string> = {
    pending:   tBo(locale, "redemption_status_pending"),
    approved:  tBo(locale, "redemption_status_approved"),
    fulfilled: tBo(locale, "redemption_status_fulfilled"),
    rejected:  tBo(locale, "redemption_status_rejected"),
  };

  const sp = await props.searchParams;
  const active = (tabs.find((t) => t.key === sp.status)?.key ?? "pending") as RedemptionStatus | "all";

  const supabase = await createSupabaseServerClient();
  const playerIds = await getGroupPlayerIds();

  let query = supabase
    .from("redemption_requests")
    .select(
      "id, status, cost_at_request, note, created_at, decided_at, item:reward_items!redemption_requests_item_id_fkey(name), player:profiles!redemption_requests_player_id_fkey(username, display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (playerIds.length) query = query.in("player_id", playerIds);
  if (active !== "all") query = query.eq("status", active);

  const { data: rows } = await query;

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-semibold">{tBo(locale, "redemptions_title")}</h1>

      <div className="flex gap-2 border-b border-zinc-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/redemptions?status=${t.key}`}
            className={
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 " +
              (active === t.key
                ? "border-foreground text-foreground"
                : "border-transparent text-zinc-500 hover:text-foreground")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{tBo(locale, "redemptions_col_time")}</th>
              <th className="px-4 py-3 font-medium">{tBo(locale, "redemptions_col_player")}</th>
              <th className="px-4 py-3 font-medium">{tBo(locale, "redemptions_col_reward")}</th>
              <th className="px-4 py-3 font-medium text-right">{tBo(locale, "redemptions_col_cost")}</th>
              <th className="px-4 py-3 font-medium">{tBo(locale, "redemptions_col_status")}</th>
              <th className="px-4 py-3 font-medium w-72">{tBo(locale, "redemptions_col_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {!rows?.length ? (
              <tr><td colSpan={6} className="px-4 py-6 text-zinc-500">{tBo(locale, "redemptions_empty")}</td></tr>
            ) : (
              rows.map((r) => {
                const item = Array.isArray(r.item) ? r.item[0] : r.item;
                const player = Array.isArray(r.player) ? r.player[0] : r.player;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{formatMalaysia(r.created_at)}</td>
                    <td className="px-4 py-3">
                      {player?.display_name ?? "—"}{" "}
                      <span className="text-zinc-500 font-mono text-xs">({player?.username})</span>
                    </td>
                    <td className="px-4 py-3">{item?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.cost_at_request}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3"><RedemptionActions id={r.id} status={r.status} /></td>
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
