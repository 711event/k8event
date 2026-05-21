"use client";

import Link from "next/link";
import { Flame, Coins } from "lucide-react";
import { Countdown } from "./Countdown";
import { TeamBadge } from "./TeamBadge";
import { FieldGridOverlay } from "./FieldGridOverlay";
import { Chip } from "./Chip";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { useFeLang } from "./LangProvider";
import { tFe } from "@/lib/i18n";

export type HeroMatch = {
  id: string;
  kickoff_at: string;
  token_reward: number;
  home: { name: string; logo_url: string | null } | null;
  away: { name: string; logo_url: string | null } | null;
};

export function HeroBanner({ match, ctaHref }: { match: HeroMatch | null; ctaHref: string }) {
  const { locale } = useFeLang();
  const t = (k: Parameters<typeof tFe>[1]) => tFe(locale, k);

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-gradient-to-br from-[#181F2C] via-[var(--bg-elevated)] to-[#0E1320] p-5 sm:p-7">
      <FieldGridOverlay />
      {/* gold aurora */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 80% at 50% -10%, rgba(255,200,87,0.18), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center text-center">
        <Chip variant="gold" className="mb-3 inline-flex items-center gap-1">
          <Flame size={12} /> {t("hero_next_match")}
        </Chip>

        {match ? (
          <>
            <div className="flex items-center gap-4 sm:gap-7 my-2">
              <div className="flex flex-col items-center gap-2">
                <TeamBadge name={match.home?.name ?? "?"} logoUrl={match.home?.logo_url} size={56} />
                <span className="text-xs sm:text-sm font-medium text-[var(--text-mid)] max-w-[88px] truncate">
                  {match.home?.name ?? "?"}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--gold-300)]">
                  VS
                </span>
                <span className="text-[10px] text-[var(--text-lo)] mt-0.5">
                  {formatMalaysia(match.kickoff_at, "MM-dd HH:mm")}
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <TeamBadge name={match.away?.name ?? "?"} logoUrl={match.away?.logo_url} size={56} />
                <span className="text-xs sm:text-sm font-medium text-[var(--text-mid)] max-w-[88px] truncate">
                  {match.away?.name ?? "?"}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-lo)] mb-1">{t("hero_countdown_label")}</div>
              <Countdown to={match.kickoff_at} className="inline-flex items-end" />
            </div>

            <Link
              href={ctaHref}
              className="mt-5 h-11 px-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] font-semibold shadow-[0_8px_20px_-8px_rgba(255,200,87,0.6)] hover:brightness-110 active:scale-[0.98] transition"
            >
              {t("hero_predict_btn")}
              <Coins size={16} />
              <span className="font-[family-name:var(--font-display)] tabular-nums">
                +{match.token_reward}
              </span>
            </Link>
          </>
        ) : (
          <div className="py-8">
            <div className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--text-hi)]">
              WORLD CUP 2026
            </div>
            <div className="text-sm text-[var(--text-mid)] mt-1">{t("hero_coming_soon")}</div>
          </div>
        )}
      </div>
    </section>
  );
}
