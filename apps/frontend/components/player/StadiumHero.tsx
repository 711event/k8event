"use client";

import { TeamBadge } from "./TeamBadge";
import { Countdown } from "./Countdown";
import { FieldGridOverlay } from "./FieldGridOverlay";
import { Chip } from "./Chip";
import { Coins } from "lucide-react";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { useFeLang } from "./LangProvider";
import { tFe } from "@/lib/i18n";
import type { MatchStatus, MatchWinner } from "@k8event/shared/supabase/types";

export function StadiumHero({
  home,
  away,
  kickoffAt,
  tokenReward,
  status,
  result,
}: {
  home: { name: string; logo_url: string | null } | null;
  away: { name: string; logo_url: string | null } | null;
  kickoffAt: string;
  tokenReward: number;
  status: MatchStatus;
  result: MatchWinner | null;
}) {
  const { locale } = useFeLang();
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);
  const beforeKickoff = Date.now() < new Date(kickoffAt).getTime();

  const resultLabel =
    result === "draw" ? t("stadium_draw") :
    result === "home" ? t("stadium_home_win") :
    t("stadium_away_win");

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-gradient-to-br from-[#181F2C] via-[var(--bg-elevated)] to-[#0E1320] p-5 sm:p-7">
      <FieldGridOverlay />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 80% at 50% -10%, rgba(255,200,87,0.18), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-center gap-2 mb-3">
          {status === "finished" && result ? (
            <Chip variant="pitch">
              {t("stadium_finished")} · {resultLabel}
            </Chip>
          ) : status === "cancelled" ? (
            <Chip variant="neutral">{t("stadium_cancelled")}</Chip>
          ) : status === "locked" || !beforeKickoff ? (
            <Chip variant="crimson" className="inline-flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[var(--crimson-500)]"
                style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
              />
              {t("stadium_live")}
            </Chip>
          ) : (
            <Chip variant="gold" className="inline-flex items-center gap-1">
              <Coins size={11} />
              {t("stadium_reward", { n: tokenReward })}
            </Chip>
          )}
        </div>

        <div className="flex items-center gap-5 sm:gap-9 justify-center">
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <TeamBadge name={home?.name ?? "?"} logoUrl={home?.logo_url} size={64} />
            <span className="font-[family-name:var(--font-display)] text-sm sm:text-base font-semibold text-[var(--text-hi)] truncate max-w-full">
              {home?.name?.startsWith("TBD") ? "?" : (home?.name ?? "?")}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-lo)]">{t("stadium_home_label")}</span>
          </div>

          <div className="flex flex-col items-center flex-shrink-0">
            <span className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-[var(--gold-300)]">
              VS
            </span>
            <span className="text-[10px] text-[var(--text-lo)] mt-1">
              {formatMalaysia(kickoffAt, "MM-dd HH:mm")}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <TeamBadge name={away?.name ?? "?"} logoUrl={away?.logo_url} size={64} />
            <span className="font-[family-name:var(--font-display)] text-sm sm:text-base font-semibold text-[var(--text-hi)] truncate max-w-full">
              {away?.name?.startsWith("TBD") ? "?" : (away?.name ?? "?")}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-lo)]">{t("stadium_away_label")}</span>
          </div>
        </div>

        {status !== "finished" && status !== "cancelled" && beforeKickoff && (
          <div className="mt-5 flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-lo)] mb-1.5">{t("stadium_countdown_label")}</div>
            <Countdown to={kickoffAt} />
          </div>
        )}
      </div>
    </section>
  );
}
