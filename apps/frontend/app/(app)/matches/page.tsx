import Link from "next/link";
import { Trophy } from "lucide-react";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { MatchCard, type MatchCardData } from "@/components/player/MatchCard";
import { SectionHeader } from "@/components/player/SectionHeader";
import { EmptyState } from "@/components/player/EmptyState";

export const metadata = { title: "比赛 · 711event" };
export const dynamic = "force-dynamic";

type Tab = "open" | "live" | "finished";

const tabs: { key: Tab; label: string }[] = [
  { key: "open", label: "可竞猜" },
  { key: "live", label: "进行中" },
  { key: "finished", label: "已结束" },
];

// Stage display order and Chinese labels
const STAGE_ORDER = [
  "Group Stage",
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Third-place",
  "Final",
];

const STAGE_LABEL: Record<string, string> = {
  "Group Stage":   "⚽ 小组赛",
  "Round of 32":  "🏟️ 32强淘汰赛",
  "Round of 16":  "⚡ 十六强",
  "Quarter-final": "🔥 八强赛",
  "Semi-final":   "💥 半决赛",
  "Third-place":  "🥉 季军争夺战",
  "Final":        "🏆 决赛",
};

function oneOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

// Group matches by stage in canonical order
function groupByStage(matches: (MatchCardData & { stage?: string | null })[]) {
  const map = new Map<string, (MatchCardData & { stage?: string | null })[]>();
  for (const m of matches) {
    const key = m.stage ?? "Group Stage";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  // Sort stage keys by STAGE_ORDER; unknown stages go last
  const sorted = [...map.entries()].sort(([a], [b]) => {
    const ai = STAGE_ORDER.indexOf(a);
    const bi = STAGE_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return sorted;
}

export default async function MatchesListPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await props.searchParams;
  const active: Tab = sp.tab === "live" || sp.tab === "finished" ? sp.tab : "open";

  const supabase = await createSupabaseServerClient();
  const query = supabase
    .from("matches")
    .select(
      "id, kickoff_at, token_reward, status, result, stage, home:teams!matches_home_team_id_fkey(name, logo_url), away:teams!matches_away_team_id_fkey(name, logo_url)",
    )
    .order("kickoff_at", { ascending: active !== "finished" });

  const { data } =
    active === "open"
      ? await query.eq("status", "scheduled").gte("kickoff_at", new Date().toISOString())
      : active === "live"
        ? await query.in("status", ["locked"])
        : await query.eq("status", "finished").limit(40);

  const matches = (data ?? []).map((m) => ({
    ...m,
    home: oneOrNull(m.home),
    away: oneOrNull(m.away),
  })) as (MatchCardData & { stage?: string | null })[];

  const groups = groupByStage(matches);
  const showGroups = active === "open" && groups.length > 1;

  return (
    <div className="space-y-5">
      <SectionHeader title="所有比赛" hint="世界杯赛程 · GMT+8 时间" />

      <div className="inline-flex rounded-full bg-[var(--bg-raised)] p-1 border border-[var(--border-strong)]">
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <Link
              key={t.key}
              href={`/matches?tab=${t.key}`}
              className={
                "px-4 py-1.5 text-xs font-semibold rounded-full transition " +
                (isActive
                  ? "bg-[var(--bg-elevated)] text-[var(--gold-300)] shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset]"
                  : "text-[var(--text-lo)] hover:text-[var(--text-mid)]")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {matches.length === 0 ? (
        <EmptyState
          icon={<Trophy size={28} />}
          title={
            active === "open"
              ? "暂无可竞猜比赛"
              : active === "live"
                ? "暂无进行中比赛"
                : "暂无已结束比赛"
          }
          body="检查赛程或回头再来看看。"
        />
      ) : showGroups ? (
        <div className="space-y-6">
          {groups.map(([stage, stageMatches]) => (
            <div key={stage} className="space-y-3">
              {/* Stage header */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--gold-300)]">
                  {STAGE_LABEL[stage] ?? stage}
                </span>
                <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                <span className="text-xs text-[var(--text-lo)]">{stageMatches.length} 场</span>
              </div>
              <div className="grid gap-3">
                {stageMatches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
