import type { MatchStatus, MatchWinner } from "@k8event/shared/supabase/types";

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
  const STATUS_CN: Record<MatchStatus, string> = {
    scheduled: "待开赛",
    locked:    "已锁定",
    finished:  "已结束",
    cancelled: "已取消",
  };
  const RESULT_CN: Record<string, string> = { home: "主队胜", away: "客队胜", draw: "平局" };
  const label = status === "finished" && result
    ? `已结束 · ${RESULT_CN[result] ?? result}`
    : STATUS_CN[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {label}
    </span>
  );
}
