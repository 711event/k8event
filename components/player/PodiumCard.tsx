import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const colors: Record<number, { ring: string; text: string; bg: string }> = {
  1: { ring: "ring-[var(--gold-500)]/60", text: "text-[var(--gold-300)]", bg: "from-[var(--gold-500)]/30" },
  2: { ring: "ring-zinc-400/40", text: "text-zinc-300", bg: "from-zinc-400/20" },
  3: { ring: "ring-amber-700/40", text: "text-amber-600", bg: "from-amber-700/20" },
};

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export function PodiumCard({
  rank,
  displayName,
  username,
  earned,
  isSelf,
}: {
  rank: 1 | 2 | 3;
  displayName: string | null;
  username: string | null;
  earned: number;
  isSelf?: boolean;
}) {
  const c = colors[rank];
  const heightClass = rank === 1 ? "pt-2" : "pt-6";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center text-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 pb-4",
        heightClass,
        isSelf && "ring-2 ring-[var(--gold-500)]/60",
      )}
    >
      {/* glow */}
      <div
        aria-hidden
        className={cn("absolute -top-6 left-1/2 -translate-x-1/2 h-10 w-16 rounded-full blur-2xl bg-gradient-to-b", c.bg, "to-transparent")}
      />
      <Crown size={rank === 1 ? 22 : 18} className={cn("mb-1 relative", c.text)} />
      <div
        className={cn(
          "relative font-[family-name:var(--font-display)] font-bold flex items-center justify-center rounded-full bg-[var(--bg-raised)] ring-2",
          c.ring,
          rank === 1 ? "h-14 w-14 text-base" : "h-12 w-12 text-sm",
        )}
      >
        {initials(displayName)}
      </div>
      <div className="relative mt-2 text-xs font-semibold text-[var(--text-hi)] truncate max-w-full">
        {displayName ?? "—"}
      </div>
      <div className="relative text-[10px] text-[var(--text-lo)] font-mono truncate max-w-full">
        {username}
      </div>
      <div className={cn("relative mt-2 font-[family-name:var(--font-display)] tabular-nums font-bold", c.text, rank === 1 ? "text-lg" : "text-base")}>
        {earned}
      </div>
      <div className="relative text-[9px] uppercase tracking-wider text-[var(--text-lo)]">tokens</div>
      <div className={cn("relative mt-1 text-[10px] font-semibold", c.text)}>#{rank}</div>
    </div>
  );
}
