import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@k8event/shared/supabase/database.types";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { malaysiaDateString } from "@k8event/shared/time/malaysia";
import { EmptyState } from "@/components/player/EmptyState";
import { CheckinButton } from "./CheckinButton";
import { getFeLocale } from "@/lib/get-locale";
import { tFe } from "@/lib/i18n";
import { getGroupId } from "@/lib/get-group";

export const metadata = { title: "每日签到 · 711event" };
export const dynamic = "force-dynamic";

const DEFAULT_REWARDS = [5, 8, 10, 12, 15, 20, 30];

// Activity config changes rarely — cache for 60 s per group
function getCheckinActivity(groupId: string) {
  return unstable_cache(
    async () => {
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data } = await supabase
        .from("activities")
        .select("id, name, description, rules, settings, banner_url")
        .eq("type", "daily_checkin")
        .eq("is_active", true)
        .eq("group_id", groupId)
        .maybeSingle();
      return data ?? null;
    },
    [`checkin-activity-${groupId}`],
    { revalidate: 60, tags: ["activities"] },
  )();
}

export default async function CheckinPage() {
  const user = await getCurrentUser();
  const locale = await getFeLocale();
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);
  const groupId = getGroupId();

  // Load the daily_checkin activity (cached, group-scoped)
  const activity = await getCheckinActivity(groupId);

  if (!activity) {
    return (
      <div className="space-y-5">
        <EmptyState
          icon={<CalendarCheck size={28} />}
          title={t("checkin_not_open_title")}
          body={t("checkin_not_open_body")}
        />
      </div>
    );
  }

  const settings = activity.settings as Record<string, unknown>;
  const dayRewards = (settings.day_rewards as number[] | undefined) ?? DEFAULT_REWARDS;

  // Localized content — fallback to zh (top-level columns) if not set
  const localeSuffix = locale === "zh" ? "" : `_${locale}`;
  const displayName =
    locale === "zh"
      ? activity.name
      : ((settings[`name${localeSuffix}`] as string | undefined) || activity.name);
  const displayDesc =
    locale === "zh"
      ? activity.description
      : ((settings[`description${localeSuffix}`] as string | undefined) || activity.description);
  const displayBanner =
    locale === "zh"
      ? activity.banner_url
      : ((settings[`banner_url${localeSuffix}`] as string | undefined) || activity.banner_url);
  const displayRules =
    locale === "zh"
      ? activity.rules
      : ((settings[`rules${localeSuffix}`] as string | undefined) || activity.rules);

  const today = malaysiaDateString();

  // Load player's check-in data
  let checkedInToday = false;
  let currentStreak = 0;
  let recentCheckins: { checkin_date: string; streak_day: number; tokens_awarded: number }[] = [];

  if (user) {
    const supabase = await createSupabaseServerClient();
    const [todayQ, recentQ] = await Promise.all([
      supabase
        .from("player_checkins")
        .select("id")
        .eq("player_id", user.id)
        .eq("activity_id", activity.id)
        .eq("checkin_date", today)
        .maybeSingle(),
      supabase
        .from("player_checkins")
        .select("checkin_date, streak_day, tokens_awarded")
        .eq("player_id", user.id)
        .eq("activity_id", activity.id)
        .order("checkin_date", { ascending: false })
        .limit(7),
    ]);
    checkedInToday = !!todayQ.data;
    recentCheckins = recentQ.data ?? [];
    currentStreak = recentCheckins[0]?.streak_day ?? 0;
    if (!checkedInToday && currentStreak > 0) {
      // Check if yesterday was checked in; if not, streak is broken
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = malaysiaDateString(yesterday);
      const hasYesterday = recentCheckins.some((c) => c.checkin_date === yStr);
      if (!hasYesterday) currentStreak = 0;
    }
  }

  // Next check-in streak day
  const nextStreakDay = checkedInToday
    ? currentStreak
    : currentStreak >= 7
    ? 1
    : currentStreak + 1;
  const todayTokens = dayRewards[nextStreakDay - 1] ?? dayRewards[0];

  // Build 7-day display grid (relative to today for visual)
  const checkinMap = new Map(recentCheckins.map((c) => [c.checkin_date, c]));

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Banner image */}
      {displayBanner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayBanner}
          alt=""
          className="w-full rounded-2xl object-cover"
          style={{ aspectRatio: "5/2", maxHeight: "300px" }}
        />
      )}

      {/* Floating World Cup button */}
      <Link
        href="/event"
        className="fixed bottom-20 left-4 z-40 flex flex-col items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-2xl px-3 py-2.5 shadow-lg hover:border-[var(--gold-500)]/60 transition group"
        style={{
          backdropFilter: "blur(8px)",
          animation: "wc-float 2.8s ease-in-out infinite",
        }}
      >
        <style>{`
          @keyframes wc-float {
            0%, 100% { transform: translateY(0px); box-shadow: 0 8px 20px rgba(0,0,0,0.35); }
            50%       { transform: translateY(-7px); box-shadow: 0 14px 28px rgba(0,0,0,0.22); }
          }
        `}</style>
        <span className="text-2xl">⚽</span>
        <span className="text-[10px] font-semibold text-[var(--gold-300)] group-hover:text-[var(--gold-200)] whitespace-nowrap">{t("event_wc_btn")}</span>
      </Link>

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-white">{displayName || t("checkin_activity_name")}</h1>
        <p className="text-sm text-zinc-400">{displayDesc || t("checkin_activity_desc")}</p>
      </div>

      {/* Streak counter */}
      {user && currentStreak > 0 && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl">🔥</span>
          <span className="text-xl font-bold text-orange-400">
            {t("checkin_streak", { n: currentStreak })}
          </span>
        </div>
      )}

      {/* 7-day reward bar */}
      <div className="rounded-2xl border border-white/10 bg-[var(--bg-elevated)] p-4">
        <div className="text-xs text-zinc-500 mb-3 text-center uppercase tracking-wider">{t("checkin_rewards_title")}</div>
        <div className="grid grid-cols-7 gap-1.5">
          {dayRewards.slice(0, 7).map((tokens, i) => {
            const day = i + 1;
            const isToday = !checkedInToday && day === nextStreakDay;
            const isPast = checkedInToday && day <= currentStreak;
            const isActive = isToday;

            return (
              <div
                key={day}
                className={
                  "flex flex-col items-center gap-1 py-2 rounded-xl border transition " +
                  (isPast
                    ? "bg-emerald-500/20 border-emerald-500/40"
                    : isActive
                    ? "bg-amber-500/20 border-amber-400/60 ring-2 ring-amber-400/30"
                    : "bg-white/5 border-white/10")
                }
              >
                <span className={
                  "text-[10px] font-medium " +
                  (isPast ? "text-emerald-400" : isActive ? "text-amber-300" : "text-zinc-500")
                }>
                  {t("checkin_day", { day })}
                </span>
                <span className={
                  "text-sm font-bold tabular-nums " +
                  (isPast ? "text-emerald-300" : isActive ? "text-amber-200" : "text-zinc-400")
                }>
                  {isPast ? "✓" : `+${tokens}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      {!user ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-400 text-center">{t("checkin_login_prompt")}</p>
          <Link
            href="/login"
            className="h-12 px-8 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-bold inline-flex items-center"
          >
            {t("checkin_login_btn")}
          </Link>
        </div>
      ) : (
        <div className="flex justify-center">
          <CheckinButton
            activityId={activity.id}
            checkedInToday={checkedInToday}
            todayTokens={todayTokens}
          />
        </div>
      )}

      {/* Recent check-ins */}
      {user && recentCheckins.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-elevated)] p-4">
          <div className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">{t("checkin_recent")}</div>
          <div className="space-y-2">
            {recentCheckins.slice(0, 7).map((c) => (
              <div key={c.checkin_date} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{c.checkin_date}</span>
                <span className="text-zinc-500">{t("checkin_day", { day: c.streak_day })}</span>
                <span className="text-emerald-400 font-medium tabular-nums">+{c.tokens_awarded}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      {displayRules && (
        <details className="rounded-xl border border-white/10">
          <summary className="px-4 py-3 cursor-pointer text-sm text-zinc-400 hover:text-zinc-300">
            {t("checkin_rules")}
          </summary>
          <div className="px-4 pb-4 text-sm text-zinc-500 whitespace-pre-wrap leading-relaxed">
            {displayRules}
          </div>
        </details>
      )}
    </div>
  );
}
