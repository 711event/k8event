import { CalendarX2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { malaysiaDateString } from "@/lib/time/malaysia";
import { HeroBanner, type HeroMatch } from "@/components/player/HeroBanner";
import { TokenWallet } from "@/components/player/TokenWallet";
import { MatchCard, type MatchCardData } from "@/components/player/MatchCard";
import { LeaderboardPreview, type PodiumEntry } from "@/components/player/LeaderboardPreview";
import { SectionHeader } from "@/components/player/SectionHeader";
import { EmptyState } from "@/components/player/EmptyState";

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

  const [matchesQ, top3Q, balanceQ, earnedQ, rechargeQ] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, kickoff_at, token_reward, status, result, home:teams!matches_home_team_id_fkey(name, logo_url), away:teams!matches_away_team_id_fkey(name, logo_url)",
      )
      .in("status", ["scheduled", "locked"])
      .order("kickoff_at", { ascending: true })
      .limit(6),
    supabase
      .from("token_earned")
      .select("player_id, earned")
      .order("earned", { ascending: false })
      .limit(3),
    user ? supabase.from("token_balances").select("balance").eq("player_id", user.id).maybeSingle() : Promise.resolve({ data: null } as const),
    user ? supabase.from("token_earned").select("earned").eq("player_id", user.id).maybeSingle() : Promise.resolve({ data: null } as const),
    user
      ? supabase
          .from("daily_recharge")
          .select("amount")
          .eq("player_id", user.id)
          .eq("recharge_date", today)
          .maybeSingle()
      : Promise.resolve({ data: null } as const),
  ]);

  // Normalize join shape (Supabase returns either object or array depending on FK uniqueness)
  const matches: RawMatch[] = (matchesQ.data ?? []).map((m) => ({
    ...m,
    home: oneOrNull(m.home),
    away: oneOrNull(m.away),
  })) as RawMatch[];

  const featured: HeroMatch | null = matches.find((m) => new Date(m.kickoff_at).getTime() > Date.now()) ?? null;
  const todayList = matches.slice(0, 4);

  // Top 3 with profile names
  const top3Ids = (top3Q.data ?? []).map((r) => r.player_id);
  let top3: PodiumEntry[] = [];
  if (top3Ids.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", top3Ids);
    const byId = new Map(profiles?.map((p) => [p.user_id, p]));
    top3 = (top3Q.data ?? []).map((r) => ({
      player_id: r.player_id,
      earned: r.earned ?? 0,
      username: byId.get(r.player_id)?.username ?? null,
      display_name: byId.get(r.player_id)?.display_name ?? null,
    }));
  }

  const balance = balanceQ.data?.balance ?? 0;
  const earned = earnedQ.data?.earned ?? 0;
  const todayRecharge = Number(rechargeQ.data?.amount ?? 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <HeroBanner match={featured} ctaHref={featured ? `/matches/${featured.id}` : "/matches"} />

      <TokenWallet
        balance={balance}
        earned={earned}
        todayRecharge={todayRecharge}
        guest={!user}
      />

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
