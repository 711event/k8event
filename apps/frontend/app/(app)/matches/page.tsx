import Link from "next/link";
import { Trophy } from "lucide-react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@k8event/shared/supabase/database.types";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { MatchCard, type MatchCardData } from "@/components/player/MatchCard";
import { SectionHeader } from "@/components/player/SectionHeader";
import { EmptyState } from "@/components/player/EmptyState";
import { getFeLocale } from "@/lib/get-locale";
import { tFe } from "@/lib/i18n";
import { getGroupId } from "@/lib/get-group";

export const metadata = { title: "比赛 · 711event" };
export const dynamic = "force-dynamic";

function getWcRules(groupId: string) {
  return unstable_cache(
    async () => {
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data } = await supabase
        .from("activities")
        .select("rules, settings")
        .eq("type", "worldcup_prediction")
        .eq("group_id", groupId)
        .maybeSingle();
      return data ?? null;
    },
    [`wc-rules-${groupId}`],
    { revalidate: 300, tags: ["activities"] },
  )();
}

type Tab = "open" | "live" | "finished";

const STAGE_ORDER = [
  "Group Stage",
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Third-place",
  "Final",
];

function oneOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function groupByStage(matches: (MatchCardData & { stage?: string | null })[]) {
  const map = new Map<string, (MatchCardData & { stage?: string | null })[]>();
  for (const m of matches) {
    const key = m.stage ?? "Group Stage";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
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

  const locale = await getFeLocale();
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);

  const wcActivity = await getWcRules(getGroupId());
  const wcSettings = wcActivity?.settings as Record<string, unknown> | null;
  const rulesText =
    locale === "zh"
      ? wcActivity?.rules
      : locale === "en"
        ? (wcSettings?.rules_en as string | undefined) ?? wcActivity?.rules
        : (wcSettings?.rules_ms as string | undefined) ?? wcActivity?.rules;

  const tabs: { key: Tab; label: string }[] = [
    { key: "open", label: t("matches_tab_open") },
    { key: "live", label: t("matches_tab_live") },
    { key: "finished", label: t("matches_tab_finished") },
  ];

  const STAGE_LABEL: Record<string, string> = {
    "Group Stage":   t("stage_group"),
    "Round of 32":  t("stage_r32"),
    "Round of 16":  t("stage_r16"),
    "Quarter-final": t("stage_qf"),
    "Semi-final":   t("stage_sf"),
    "Third-place":  t("stage_3rd"),
    "Final":        t("stage_final"),
  };

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
      <SectionHeader title={t("matches_title")} hint={t("matches_hint")} />

      {rulesText && (
        <details className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)]">
          <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm font-medium text-[var(--text-mid)] hover:text-[var(--text-hi)] transition select-none list-none">
            <span className="text-base">📋</span>
            {t("matches_rules")}
            <span className="ml-auto text-[var(--text-lo)] text-xs">▸</span>
          </summary>
          <div className="px-4 pb-4 text-sm text-[var(--text-mid)] whitespace-pre-wrap leading-relaxed border-t border-[var(--border-subtle)] pt-3">
            {rulesText}
          </div>
        </details>
      )}

      <div className="inline-flex rounded-full bg-[var(--bg-raised)] p-1 border border-[var(--border-strong)]">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/matches?tab=${tab.key}`}
              className={
                "px-4 py-1.5 text-xs font-semibold rounded-full transition " +
                (isActive
                  ? "bg-[var(--bg-elevated)] text-[var(--gold-300)] shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset]"
                  : "text-[var(--text-lo)] hover:text-[var(--text-mid)]")
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {matches.length === 0 ? (
        <EmptyState
          icon={<Trophy size={28} />}
          title={
            active === "open"
              ? t("matches_empty_open")
              : active === "live"
                ? t("matches_empty_live")
                : t("matches_empty_finished")
          }
          body={t("matches_empty_body")}
        />
      ) : showGroups ? (
        <div className="space-y-6">
          {groups.map(([stage, stageMatches]) => (
            <div key={stage} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--gold-300)]">
                  {STAGE_LABEL[stage] ?? stage}
                </span>
                <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                <span className="text-xs text-[var(--text-lo)]">{t("matches_count", { n: stageMatches.length })}</span>
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
