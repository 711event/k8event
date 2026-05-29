"use client";

import Link from "next/link";
import { Coins, Timer } from "lucide-react";
import { TeamBadge } from "./TeamBadge";
import { Countdown } from "./Countdown";
import { Chip } from "./Chip";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { useFeLang } from "./LangProvider";
import { tFe } from "@/lib/i18n";
import type { MatchStatus, MatchWinner } from "@k8event/shared/supabase/types";

export type MatchCardData = {
  id: string;
  kickoff_at: string;
  token_reward: number;
  status: MatchStatus;
  result: MatchWinner | null;
  home: { name: string; logo_url: string | null } | null;
  away: { name: string; logo_url: string | null } | null;
};

export function MatchCard({
  match,
  highlighted = false,
}: {
  match: MatchCardData;
  highlighted?: boolean;
}) {
  const { locale } = useFeLang();
  const t = (k: Parameters<typeof tFe>[1]) => tFe(locale, k);

  const home = match.home;
  const away = match.away;
  const now = Date.now();
  const kickoffMs = new Date(match.kickoff_at).getTime();
  const live = match.status === "locked" || (now >= kickoffMs && match.status === "scheduled");
  const finished = match.status === "finished";

  return (
    <Link
      href={`/matches/${match.id}`}
      className={
        "block rounded-[var(--radius-md)] border bg-[var(--bg-elevated)] p-4 transition hover:-translate-y-0.5 " +
        (highlighted
          ? "border-[var(--gold-500)]/40 shadow-[var(--shadow-glow)]"
          : "border-[var(--border-strong)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card)]")
      }
    >
      <div className="flex items-center justify-between text-[11px] mb-3">
        <span className="text-[var(--text-lo)]">{formatMalaysia(match.kickoff_at, "MM-dd HH:mm")} (GMT+8)</span>
        {finished ? (
          <Chip variant="pitch">{t("match_finished_label")} · {match.result}</Chip>
        ) : live ? (
          <Chip variant="crimson" className="inline-flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--crimson-500)]"
              style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
            />
            {t("match_live")}
          </Chip>
        ) : (
          <Chip variant="azure">{t("match_can_predict")}</Chip>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <TeamBadge name={home?.name ?? "?"} logoUrl={home?.logo_url} size={44} />
          <span className="text-xs font-medium text-[var(--text-hi)] truncate max-w-full">
            {home?.name?.startsWith("TBD") ? "?" : (home?.name ?? "?")}
          </span>
        </div>
        <div className="flex flex-col items-center flex-shrink-0 min-w-[80px]">
          <span className="font-[family-name:var(--font-display)] text-base text-[var(--gold-300)] font-bold">VS</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <TeamBadge name={away?.name ?? "?"} logoUrl={away?.logo_url} size={44} />
          <span className="text-xs font-medium text-[var(--text-hi)] truncate max-w-full">
            {away?.name?.startsWith("TBD") ? "?" : (away?.name ?? "?")}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-1.5 text-[var(--text-mid)] text-xs">
          <Timer size={13} />
          {finished ? (
            <span>{t("match_settled")}</span>
          ) : (
            <Countdown to={match.kickoff_at} compact className="tabular-nums" />
          )}
        </div>
        <div className="flex items-center gap-1 text-[var(--gold-300)] text-xs font-semibold">
          <Coins size={13} />
          <span className="tabular-nums">+{match.token_reward}</span>
        </div>
      </div>
    </Link>
  );
}
