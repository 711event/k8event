"use client";

import { SectionHeader } from "./SectionHeader";
import { PodiumCard } from "./PodiumCard";
import { EmptyState } from "./EmptyState";
import { Trophy } from "lucide-react";
import { useFeLang } from "./LangProvider";
import { tFe } from "@/lib/i18n";

export type PodiumEntry = {
  player_id: string;
  earned: number;
  username: string | null;
  display_name: string | null;
};

export function LeaderboardPreview({
  top3,
  currentUserId,
}: {
  top3: PodiumEntry[];
  currentUserId?: string | null;
}) {
  const { locale } = useFeLang();
  const t = (k: Parameters<typeof tFe>[1]) => tFe(locale, k);

  if (!top3.length) {
    return (
      <div>
        <SectionHeader title={t("leaderboard_ranking_title")} href="/leaderboard" />
        <div className="mt-3">
          <EmptyState
            icon={<Trophy size={28} />}
            title={t("leaderboard_empty_title")}
            body={t("leaderboard_empty_body")}
          />
        </div>
      </div>
    );
  }

  // Order for display: 2nd left, 1st center, 3rd right
  const r2 = top3.find((_, i) => i === 1);
  const r1 = top3.find((_, i) => i === 0);
  const r3 = top3.find((_, i) => i === 2);

  return (
    <div>
      <SectionHeader title={t("leaderboard_title")} hint={t("leaderboard_hint")} href="/leaderboard" />
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3 items-end">
        {r2 ? (
          <PodiumCard
            rank={2}
            displayName={r2.display_name}
            username={r2.username}
            earned={r2.earned}
            isSelf={r2.player_id === currentUserId}
          />
        ) : (
          <div />
        )}
        {r1 ? (
          <PodiumCard
            rank={1}
            displayName={r1.display_name}
            username={r1.username}
            earned={r1.earned}
            isSelf={r1.player_id === currentUserId}
          />
        ) : (
          <div />
        )}
        {r3 ? (
          <PodiumCard
            rank={3}
            displayName={r3.display_name}
            username={r3.username}
            earned={r3.earned}
            isSelf={r3.player_id === currentUserId}
          />
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
