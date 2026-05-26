import Link from "next/link";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { getGroupId } from "@/lib/get-group";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { ActivitiesManager } from "./ActivitiesManager";

export const metadata = { title: "Activities · Admin Panel" };

export default async function ActivitiesPage() {
  await requireRole("admin");
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  const ACTIVITY_TYPE_LABEL: Record<string, string> = {
    worldcup_prediction: t("activity_type_worldcup"),
    daily_checkin: t("activity_type_checkin"),
    lucky_draw: t("activity_type_lucky"),
    spin_wheel: t("activity_type_spin"),
    deposit_mission: t("activity_type_deposit"),
    referral_mission: t("activity_type_referral"),
  };

  const supabase = await createSupabaseServerClient();

  const { data: activities } = await supabase
    .from("activities")
    .select("id, type, name, slug, is_active, is_visible, sort_order, start_at, end_at, created_at")
    .eq("group_id", getGroupId())
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("activities_title")}</h1>
        <span className="text-sm text-zinc-500">{t("activities_count", { count: activities?.length ?? 0 })}</span>
      </div>

      {/* Create new activity */}
      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-medium mb-4">{t("activities_create")}</h2>
        <ActivitiesManager />
      </section>

      {/* Activities list */}
      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium w-12">{t("activities_col_sort")}</th>
              <th className="px-4 py-3 font-medium">{t("activities_col_name")}</th>
              <th className="px-4 py-3 font-medium">{t("activities_col_type")}</th>
              <th className="px-4 py-3 font-medium">{t("activities_col_active")}</th>
              <th className="px-4 py-3 font-medium">{t("activities_col_visible")}</th>
              <th className="px-4 py-3 font-medium">{t("activities_col_time")}</th>
              <th className="px-4 py-3 font-medium w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {!activities?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-zinc-500">{t("activities_empty")}</td>
              </tr>
            ) : (
              activities.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 tabular-nums text-zinc-500">{a.sort_order}</td>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700">
                      {ACTIVITY_TYPE_LABEL[a.type] ?? a.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " +
                        (a.is_active
                          ? "bg-green-500/15 text-green-600"
                          : "bg-zinc-500/15 text-zinc-500")
                      }
                    >
                      {a.is_active ? t("activities_on") : t("activities_off")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " +
                        (a.is_visible
                          ? "bg-amber-500/15 text-amber-600"
                          : "bg-zinc-500/15 text-zinc-500")
                      }
                    >
                      {a.is_visible ? t("activities_show") : t("activities_hide")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {a.start_at ? formatMalaysia(a.start_at) : "—"}
                    {a.end_at ? <> → {formatMalaysia(a.end_at)}</> : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {a.type === "worldcup_prediction" && (
                        <>
                          <Link href="/admin/teams" className="text-xs text-zinc-500 hover:text-zinc-900 underline">
                            {t("activities_teams")}
                          </Link>
                          <Link href="/admin/matches" className="text-xs text-zinc-500 hover:text-zinc-900 underline">
                            {t("activities_matches")}
                          </Link>
                        </>
                      )}
                      <Link href={`/admin/activities/${a.id}`} className="text-sm underline">
                        {t("activities_settings")}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
