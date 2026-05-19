import Link from "next/link";
import { Trophy, CalendarCheck, Clock } from "lucide-react";

interface Activity {
  id: string;
  type: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  end_at: string | null;
  settings: Record<string, unknown>;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  worldcup_prediction: <Trophy size={18} className="text-amber-300" />,
  daily_checkin: <CalendarCheck size={18} className="text-emerald-400" />,
};

const TYPE_COLORS: Record<string, string> = {
  worldcup_prediction: "from-[#1a2a44] to-[#0d1829]",
  daily_checkin: "from-[#0e2a1a] to-[#081510]",
};

const TYPE_ACCENT: Record<string, string> = {
  worldcup_prediction: "text-amber-300 border-amber-500/30",
  daily_checkin: "text-emerald-400 border-emerald-500/30",
};

const TYPE_HREF: Record<string, string> = {
  worldcup_prediction: "/matches",
  daily_checkin: "/activities/checkin",
};

const TYPE_CTA: Record<string, string> = {
  worldcup_prediction: "去竞猜 →",
  daily_checkin: "立即签到 →",
};

function CountdownChip({ endAt }: { endAt: string }) {
  const end = new Date(endAt).getTime();
  const now = Date.now();
  if (end <= now) return <span className="text-xs text-zinc-500">已结束</span>;
  const diff = end - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
      <Clock size={11} />
      {days > 0 ? `${days}天 ${hours}小时` : `${hours}小时`}后结束
    </span>
  );
}

export function ActivityCard({ activity }: { activity: Activity }) {
  const gradient = TYPE_COLORS[activity.type] ?? "from-[#1a1a2e] to-[#0f0f1a]";
  const accent = TYPE_ACCENT[activity.type] ?? "text-zinc-300 border-zinc-500/30";
  const href = TYPE_HREF[activity.type] ?? "/activities";
  const cta = TYPE_CTA[activity.type] ?? "参与活动 →";
  const icon = TYPE_ICONS[activity.type] ?? <Trophy size={18} />;

  // Token reward display
  let rewardText = "";
  if (activity.type === "worldcup_prediction") {
    const r = activity.settings.token_reward as number | undefined;
    if (r) rewardText = `猜中赢 ${r} Token`;
  } else if (activity.type === "daily_checkin") {
    const rewards = activity.settings.day_rewards as number[] | undefined;
    if (rewards?.length) rewardText = `每日 ${rewards[0]}–${rewards[rewards.length - 1]} Token`;
  }

  return (
    <Link href={href} className="block group">
      <div
        className={
          "relative rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br " +
          gradient +
          " transition-transform duration-200 group-hover:scale-[1.01]"
        }
      >
        {/* Banner image */}
        {activity.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activity.banner_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}

        <div className="relative p-5 flex flex-col gap-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border ${accent} bg-white/5`}>
                {icon}
              </div>
              <div>
                <div className="font-semibold text-white text-base leading-tight">
                  {activity.name}
                </div>
                {activity.end_at && <CountdownChip endAt={activity.end_at} />}
              </div>
            </div>
            {rewardText && (
              <span
                className={
                  "flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border bg-white/5 " +
                  accent
                }
              >
                {rewardText}
              </span>
            )}
          </div>

          {/* Description */}
          {activity.description && (
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
              {activity.description}
            </p>
          )}

          {/* CTA */}
          <div className="flex justify-end">
            <span
              className={
                "text-sm font-semibold px-4 py-1.5 rounded-full border bg-white/5 transition group-hover:bg-white/10 " +
                accent
              }
            >
              {cta}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
