import { CalendarX2 } from "lucide-react";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { malaysiaDateString } from "@k8event/shared/time/malaysia";
import { HeroBanner, type HeroMatch } from "@/components/player/HeroBanner";
import { TokenWallet } from "@/components/player/TokenWallet";
import { MatchCard, type MatchCardData } from "@/components/player/MatchCard";
import { LeaderboardPreview, type PodiumEntry } from "@/components/player/LeaderboardPreview";
import { SectionHeader } from "@/components/player/SectionHeader";
import { EmptyState } from "@/components/player/EmptyState";
import { CheckinCard } from "@/components/player/CheckinCard";

export const metadata = { title: "赛事 · 711event" };
export const dynamic = "force-dynamic";

type RawMatch = MatchCardData;

function oneOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default async function EventHomePage() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const today = malaysiaDateString();
  const nowIso = new Date().toISOString();

  const DEFAULT_CHECKIN_REWARDS = [5, 8, 10, 12, 15, 20, 30];

  // Single parallel round-trip — all 9 queries fire at once
  const [
    matchesQ, top3Q, balanceQ, earnedQ, rechargeQ,
    checkinActivityQ, profilesQ, todayCIQ, recentCIQ,
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("id, kickoff_at, token_reward, status, result, home:teams!matches_home_team_id_fkey(name, logo_url), away:teams!matches_away_team_id_fkey(name, logo_url)")
      .in("status", ["scheduled", "locked"])
      .order("kickoff_at", { ascending: true })
      .limit(6),
    supabase.from("token_earned").select("player_id, earned").order("earned", { ascending: false }).limit(3),
    user ? supabase.from("token_balances").select("balance").eq("player_id", user.id).maybeSingle() : Promise.resolve({ data: null } as const),
    user ? supabase.from("token_earned").select("earned").eq("player_id", user.id).maybeSingle() : Promise.resolve({ data: null } as const),
    user ? supabase.from("daily_recharge").select("amount").eq("player_id", user.id).eq("recharge_date", today).maybeSingle() : Promise.resolve({ data: null } as const),
    supabase.from("activities").select("id, settings").eq("type", "daily_checkin").eq("is_active", true).maybeSingle(),
    // Profiles for leaderboard — fetched speculatively (filtered in code)
    supabase.from("profiles").select("user_id, username, display_name"),
    // Player checkin for today (no activity_id needed — only 1 daily_checkin activity)
    user ? supabase.from("player_checkins").select("activity_id").eq("player_id", user.id).eq("checkin_date", today).maybeSingle() : Promise.resolve({ data: null } as const),
    // Recent 2 checkins for streak
    user ? supabase.from("player_checkins").select("checkin_date, streak_day, activity_id").eq("player_id", user.id).order("checkin_date", { ascending: false }).limit(2) : Promise.resolve({ data: null } as const),
  ]);

  // Normalize join shape
  const matches: RawMatch[] = (matchesQ.data ?? []).map((m) => ({
    ...m,
    home: oneOrNull(m.home),
    away: oneOrNull(m.away),
  })) as RawMatch[];

  const featured: HeroMatch | null = matches.find((m) => new Date(m.kickoff_at).getTime() > Date.now()) ?? null;
  const todayList = matches.slice(0, 4);

  // Top 3 with profile names (resolved from the speculative profiles fetch)
  const top3Ids = (top3Q.data ?? []).map((r) => r.player_id);
  const allProfiles = profilesQ.data ?? [];
  const byId = new Map(allProfiles.map((p) => [p.user_id, p]));
  const top3: PodiumEntry[] = (top3Q.data ?? [])
    .filter((r) => top3Ids.includes(r.player_id))
    .map((r) => ({
      player_id: r.player_id,
      earned: r.earned ?? 0,
      username: byId.get(r.player_id)?.username ?? null,
      display_name: byId.get(r.player_id)?.display_name ?? null,
    }));

  const balance = balanceQ.data?.balance ?? 0;
  const earned = earnedQ.data?.earned ?? 0;
  const todayRecharge = Number(rechargeQ.data?.amount ?? 0);

  // Check-in data (derived from single-round-trip queries above)
  const checkinActivity = checkinActivityQ.data;
  const checkedInToday = !!(todayCIQ.data && checkinActivity && todayCIQ.data.activity_id === checkinActivity.id);
  const recentCheckins = (recentCIQ.data ?? []).filter((c) => !checkinActivity || c.activity_id === checkinActivity.id);
  let currentStreak = 0;
  const latest = recentCheckins[0];
  if (latest) {
    if (checkedInToday) {
      currentStreak = latest.streak_day;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = malaysiaDateString(yesterday);
      currentStreak = recentCheckins.some((c) => c.checkin_date === yStr) ? latest.streak_day : 0;
    }
  }
  const checkinSettings = checkinActivity?.settings as Record<string, unknown> | null;
  const dayRewards = (checkinSettings?.day_rewards as number[] | undefined) ?? DEFAULT_CHECKIN_REWARDS;
  const nextStreakDay = checkedInToday ? currentStreak : currentStreak >= 7 ? 1 : currentStreak + 1;
  const todayCheckinTokens = dayRewards[nextStreakDay - 1] ?? dayRewards[0];

  return (
    <div className="space-y-6 sm:space-y-8">
      <HeroBanner match={featured} ctaHref={featured ? `/matches/${featured.id}` : "/matches"} />

      <TokenWallet
        balance={balance}
        earned={earned}
        todayRecharge={todayRecharge}
        guest={!user}
      />

      {user && checkinActivity && (
        <CheckinCard
          checkedInToday={checkedInToday}
          currentStreak={currentStreak}
          todayTokens={todayCheckinTokens}
          activityId={checkinActivity.id}
        />
      )}

      <section className="space-y-3">
        <SectionHeader title="今日比赛" hint="开赛前可提交一次预测" href="/matches" />
        {todayList.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 size={28} />}
            title="今天暂无安排"
            body="管理员录入新场次后会在这里出现。"
          />
        ) : (
          <div className="grid gap-3">
            {todayList.map((m, i) => (
              <MatchCard key={m.id} match={m} highlighted={i === 0 && m.id === featured?.id} />
            ))}
          </div>
        )}
      </section>

      <section>
        <LeaderboardPreview top3={top3} currentUserId={user?.id ?? null} />
      </section>
    </div>
  );
}
