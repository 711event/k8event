"use client";

import type { MatchStatus, MatchWinner } from "@k8event/shared/supabase/types";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";

const styles: Record<MatchStatus, string> = {
  scheduled: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  locked: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  finished: "bg-green-500/15 text-green-600",
  cancelled: "bg-zinc-500/15 text-zinc-500",
};

export function StatusBadge({
  status,
  result,
}: {
  status: MatchStatus;
  result?: MatchWinner | null;
}) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);
  const STATUS_LABELS: Record<MatchStatus, string> = {
    scheduled: t("match_status_scheduled"),
    locked:    t("match_status_locked"),
    finished:  t("match_status_finished"),
    cancelled: t("match_status_cancelled"),
  };
  const RESULT_LABELS: Record<string, string> = {
    home: t("match_result_home"),
    away: t("match_result_away"),
    draw: t("match_result_draw"),
  };
  const label = status === "finished" && result
    ? `${t("match_status_finished")} · ${RESULT_LABELS[result] ?? result}`
    : STATUS_LABELS[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {label}
    </span>
  );
}
