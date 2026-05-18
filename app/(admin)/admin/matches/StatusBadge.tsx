import type { MatchStatus, MatchWinner } from "@/lib/supabase/types";

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
  const label = status === "finished" && result ? `finished · ${result}` : status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {label}
    </span>
  );
}
