import Link from "next/link";
import { CalendarCheck } from "lucide-react";

interface Props {
  checkedInToday: boolean;
  currentStreak: number;
  todayTokens: number;
  activityId: string;
}

export function CheckinCard({ checkedInToday, currentStreak, todayTokens }: Props) {
  return (
    <Link
      href="/activities/checkin"
      className="block rounded-2xl border border-white/10 bg-[var(--bg-elevated)] overflow-hidden hover:border-emerald-500/30 transition"
    >
      <div className="flex items-center gap-4 p-4">
        <div
          className={
            "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 " +
            (checkedInToday
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-amber-500/20 text-amber-400")
          }
        >
          {checkedInToday ? <CalendarCheck size={22} /> : <span className="text-xl">📅</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">
            {checkedInToday ? "今日已签到 ✓" : "每日签到"}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">
            {checkedInToday
              ? currentStreak > 0
                ? `连续签到 ${currentStreak} 天 🔥`
                : "明天继续签到"
              : `签到得 +${todayTokens} Token`}
          </div>
        </div>

        {!checkedInToday && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center h-8 px-3 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white text-xs font-bold shadow shadow-emerald-500/20">
              签到
            </span>
          </div>
        )}
      </div>

      {!checkedInToday && (
        <div className="h-1 bg-gradient-to-r from-emerald-500/40 via-amber-400/40 to-emerald-500/40 animate-pulse" />
      )}
    </Link>
  );
}
