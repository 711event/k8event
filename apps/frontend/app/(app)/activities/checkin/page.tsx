import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { malaysiaDateString } from "@k8event/shared/time/malaysia";
import { EmptyState } from "@/components/player/EmptyState";
import { CheckinButton } from "./CheckinButton";

export const metadata = { title: "每日签到 · 711event" };
export const dynamic = "force-dynamic";

const DEFAULT_REWARDS = [5, 8, 10, 12, 15, 20, 30];

export default async function CheckinPage() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  // Load the daily_checkin activity
  const { data: activity } = await supabase
    .from("activities")
    .select("id, name, description, rules, settings")
    .eq("type", "daily_checkin")
    .eq("is_active", true)
    .maybeSingle();

  if (!activity) {
    return (
      <div className="space-y-5">
        <EmptyState
          icon={<CalendarCheck size={28} />}
          title="签到活动暂未开启"
          body="管理员开启后可以在这里每日签到。"
        />
      </div>
    );
  }

  const settings = activity.settings as Record<string, unknown>;
  const dayRewards = (settings.day_rewards as number[] | undefined) ?? DEFAULT_REWARDS;

  const today = malaysiaDateString();

  // Load player's check-in data
  let checkedInToday = false;
  let currentStreak = 0;
  let recentCheckins: { checkin_date: string; streak_day: number; tokens_awarded: number }[] = [];

  if (user) {
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/activities" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← 活动中心
        </Link>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-white">{activity.name}</h1>
        {activity.description && (
          <p className="text-sm text-zinc-400">{activity.description}</p>
        )}
      </div>

      {/* Streak counter */}
      {user && currentStreak > 0 && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl">🔥</span>
          <span className="text-xl font-bold text-orange-400">
            连续签到 {currentStreak} 天
          </span>
        </div>
      )}

      {/* 7-day reward bar */}
      <div className="rounded-2xl border border-white/10 bg-[var(--bg-elevated)] p-4">
        <div className="text-xs text-zinc-500 mb-3 text-center uppercase tracking-wider">7天签到奖励</div>
        <div className="grid grid-cols-7 gap-1.5">
          {dayRewards.slice(0, 7).map((tokens, i) => {
            const day = i + 1;
            // Check if this day is in recent checkins
            const isCompleted = recentCheckins.some((c) => c.streak_day === day && (
              // Check if this was checked in recently (within last 7 days for visual purposes)
              checkinMap.size > 0
            ));
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
                  第{day}天
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
          <p className="text-sm text-zinc-400 text-center">登录后参与每日签到</p>
          <Link
            href="/login"
            className="h-12 px-8 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-bold inline-flex items-center"
          >
            去登录
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
          <div className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">近期签到</div>
          <div className="space-y-2">
            {recentCheckins.slice(0, 7).map((c) => (
              <div key={c.checkin_date} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{c.checkin_date}</span>
                <span className="text-zinc-500">第 {c.streak_day} 天</span>
                <span className="text-emerald-400 font-medium tabular-nums">+{c.tokens_awarded}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      {activity.rules && (
        <details className="rounded-xl border border-white/10">
          <summary className="px-4 py-3 cursor-pointer text-sm text-zinc-400 hover:text-zinc-300">
            活动规则
          </summary>
          <div className="px-4 pb-4 text-sm text-zinc-500 whitespace-pre-wrap leading-relaxed">
            {activity.rules}
          </div>
        </details>
      )}
    </div>
  );
}
