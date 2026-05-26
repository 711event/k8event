import Link from "next/link";
import { Users, CheckCircle2, ClipboardCheck, MessageSquare, ArrowRight } from "lucide-react";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";
import { malaysiaDateString } from "@k8event/shared/time/malaysia";
import { getGroupId, getGroupPlayerIds } from "@/lib/get-group";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";

export const metadata = { title: "总览 · 管理后台" };
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireRole(["admin", "agent"]);
  const supabase = await createSupabaseServerClient();
  const today = malaysiaDateString();
  const groupId = getGroupId();
  const playerIds = await getGroupPlayerIds();
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  const [playersCount, todayEligibleCount, pendingRedemptions, openChats] = await Promise.all([
    supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "player").eq("group_id", groupId),
    playerIds.length
      ? supabase.from("daily_recharge").select("player_id", { count: "exact", head: true }).eq("recharge_date", today).gte("amount", 500).in("player_id", playerIds)
      : Promise.resolve({ count: 0 }),
    playerIds.length
      ? supabase.from("redemption_requests").select("id", { count: "exact", head: true }).eq("status", "pending").in("player_id", playerIds)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("chat_threads")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .in("status", ["open", "claimed"]),
  ]);

  const cards = [
    {
      label: t("overview_stat_players"),
      value: playersCount.count ?? 0,
      href: "/admin/players",
      icon: Users,
      tone: "text-blue-600 bg-blue-50",
    },
    {
      label: t("overview_stat_qualified", { date: today }),
      value: todayEligibleCount.count ?? 0,
      href: "/admin/recharge",
      icon: CheckCircle2,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      label: t("overview_stat_redemptions"),
      value: pendingRedemptions.count ?? 0,
      href: "/admin/redemptions",
      icon: ClipboardCheck,
      tone: "text-amber-600 bg-amber-50",
    },
    {
      label: t("overview_stat_threads"),
      value: openChats.count ?? 0,
      href: "/admin/chat",
      icon: MessageSquare,
      tone: "text-violet-600 bg-violet-50",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{t("overview_title")}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{t("overview_subtitle", { date: today })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              className="group block bg-white rounded-lg border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between">
                <div className={"h-10 w-10 rounded-lg flex items-center justify-center " + c.tone}>
                  <Icon size={18} />
                </div>
                <ArrowRight
                  size={16}
                  className="text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition"
                />
              </div>
              <div className="mt-4">
                <div className="text-xs text-zinc-500">{c.label}</div>
                <div className="text-2xl font-semibold mt-1 text-zinc-900 tabular-nums">
                  {c.value}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-5">
        <div className="text-sm font-semibold text-zinc-900">{t("overview_quick_title")}</div>
        <p className="text-xs text-zinc-500 mt-0.5">{t("overview_quick_subtitle")}</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <QuickLink href="/admin/players" label={t("overview_quick_create_player")} />
          <QuickLink href="/admin/recharge" label={t("overview_quick_recharge")} />
          <QuickLink href="/admin/matches" label={t("overview_quick_match")} />
          <QuickLink href="/admin/rewards" label={t("overview_quick_reward")} />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm px-3 py-2 rounded border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition text-center"
    >
      {label}
    </Link>
  );
}
