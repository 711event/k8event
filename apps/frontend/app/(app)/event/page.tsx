import { CalendarX2 } from "lucide-react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { malaysiaDateString } from "@k8event/shared/time/malaysia";
import type { Database } from "@k8event/shared/supabase/database.types";
import { HeroBanner, type HeroMatch } from "@/components/player/HeroBanner";
import { TokenWallet } from "@/components/player/TokenWallet";
import { MatchCard, type MatchCardData } from "@/components/player/MatchCard";
import { LeaderboardPreview, type PodiumEntry } from "@/components/player/LeaderboardPreview";
import { SectionHeader } from "@/components/player/SectionHeader";
import { EmptyState } from "@/components/player/EmptyState";
import { CheckinCard } from "@/components/player/CheckinCard";
import { getFeLocale } from "@/lib/get-locale";
import { tFe } from "@/lib/i18n";

export const metadata = { title: "赛事 · 711event" };
// Remove force-dynamic — unstable_cache handles freshness for public data;
// user-specific queries are always live per request.
export const dynamic = "force-dynamic";

type RawMatch = MatchCardData;

function oneOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

// ---------------------------------------------------------------------------
// Public data: cached for 30 s per group — reduces PostgREST load significantly.
// Uses anon key (no cookies), safe for server-side caching.
// Cache key includes GROUP_ID so each group gets an isolated cache entry.
// ---------------------------------------------------------------------------
const GROUP_ID = process.env.NEXT_PUBLIC_GROUP_ID ?? "default";

const getPublicEventData = unstable_cache(
  async (groupId: string) => {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // First get all player IDs for this group so we can scope leaderboard correctly
    const { data: groupProfiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("role", "player");
    const groupPlayerIds = (groupProfiles ?? []).map((p) => p.user_id);

    const [matchesQ, top3Q, checkinActivityQ, predictionActivityQ] = await Promise.all([
      supabase
        .from("matches")
        .select("id, kickoff_at, token_reward, status, result, home:teams!matches_home_team_id_fkey(name, logo_url), away:teams!matches_away_team_id_fkey(name, logo_url)")
        .in("status", ["scheduled", "locked"])
        .order("kickoff_at", { ascending: true })
        .limit(6),
      groupPlayerIds.length > 0
        ? supabase.from("token_earned").select("player_id, earned").in("player_id", groupPlayerIds).order("earned", { ascending: false }).limit(3)
        : Promise.resolve({ data: [] }),
      supabase.from("activities").select("id, settings").eq("type", "daily_checkin").eq("is_active", true).eq("group_id", groupId).maybeSingle(),
      // Fetch worldcup_prediction settings so the recharge threshold shown in
      // TokenWallet matches what the admin configured, not a hardcoded 500.
      supabase.from("activities").select("settings").eq("type", "worldcup_prediction").eq("is_active", true).eq("group_id", groupId).maybeSingle(),
    ]);

    // Fetch profiles only for the top-3 players (not the entire table)
    const top3Ids = (top3Q.data ?? []).map((r) => r.player_id);
    const profilesQ = top3Ids.length > 0
      ? await supabase.from("profiles").select("user_id, username, display_name").in("user_id", top3Ids)
      : { data: [] as { user_id: string; username: string | null; display_name: string }[] };

    return {
      matchesData: matchesQ.data ?? [],
      top3Data: top3Q.data ?? [],
      profilesData: profilesQ.data ?? [],
      checkinActivityData: checkinActivityQ.data ?? null,
      predictionActivityData: predictionActivityQ.data ?? null,
    };
  },
  ["event-public-v2"],
  { revalidate: 30, tags: ["event-public"] },
);

export default async function EventHomePage() {
  const user = await getCurrentUser();
  const today = malaysiaDateString();
  const locale = await getFeLocale();
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);

  const DEFAULT_CHECKIN_REWARDS = [5, 8, 10, 12, 15, 20, 30];

  // Public data (cached 30 s) + user-specific data (always live) — fire in parallel
  const [publicData, balanceQ, earnedQ, rechargeQ, chancesQ, todayCIQ, recentCIQ] = await Promise.all([
    getPublicEventData(GROUP_ID),
    user
      ? createSupabaseServerClient().then((s) => s.from("token_balances").select("balance").eq("player_id", user.id).maybeSingle())
      : Promise.resolve({ data: null } as const),
    user
      ? createSupabaseServerClient().then((s) => s.from("token_earned").select("earned").eq("player_id", user.id).maybeSingle())
      : Promise.resolve({ data: null } as const),
    user
      ? createSupabaseServerClient().then((s) => s.from("daily_recharge").select("amount").eq("player_id", user.id).eq("recharge_date", today).maybeSingle())
      : Promise.resolve({ data: null } as const),
    // Accumulated prediction chances: qualifying deposit days minus predictions used
    user
      ? createSupabaseServerClient().then((s) => s.rpc("available_prediction_chances", { p_player: user.id }))
      : Promise.resolve({ data: null } as const),
    user
      ? createSupabaseServerClient().then((s) => s.from("player_checkins").select("activity_id").eq("player_id", user.id).eq("checkin_date", today).maybeSingle())
      : Promise.resolve({ data: null } as const),
    user
      ? createSupabaseServerClient().then((s) => s.from("player_checkins").select("checkin_date, streak_day, activity_id").eq("player_id", user.id).order("checkin_date", { ascending: false }).limit(2))
      : Promise.resolve({ data: null } as const),
  ]);

  const { matchesData, top3Data, profilesData, checkinActivityData, predictionActivityData } = publicData;

  // Read the admin-configured recharge threshold for this group.
  // Falls back to 500 if the worldcup_prediction activity has no setting yet.
  const predictionSettings = predictionActivityData?.settings as Record<string, unknown> | null;
  const minRecharge = Number(predictionSettings?.min_recharge_amount ?? 500);

  // Normalize join shape
  const matches: RawMatch[] = (matchesData).map((m) => ({
    ...m,
    home: oneOrNull(m.home),
    away: oneOrNull(m.away),
  })) as RawMatch[];

  const featured: HeroMatch | null = matches.find((m) => new Date(m.kickoff_at).getTime() > Date.now()) ?? null;
  const todayList = matches.slice(0, 4);

  // Top 3 with profile names (profiles already scoped to top-3 IDs)
  const byId = new Map(profilesData.map((p) => [p.user_id, p]));
  const top3: PodiumEntry[] = top3Data.map((r) => ({
    player_id: r.player_id,
    earned: r.earned ?? 0,
    username: byId.get(r.player_id)?.username ?? null,
    display_name: byId.get(r.player_id)?.display_name ?? null,
  }));

  const balance = balanceQ.data?.balance ?? 0;
  const earned = earnedQ.data?.earned ?? 0;
  const todayRecharge = Number(rechargeQ.data?.amount ?? 0);
  const predictionChances = typeof chancesQ.data === "number" ? chancesQ.data : null;

  // Check-in data
  const checkinActivity = checkinActivityData;
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
        predictionChances={predictionChances ?? undefined}
        threshold={minRecharge}
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
        <SectionHeader title={t("event_today")} hint={t("event_today_hint")} href="/matches" />
        {todayList.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 size={28} />}
            title={t("event_empty_title")}
            body={t("event_empty_body")}
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
