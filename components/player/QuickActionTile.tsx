import Link from "next/link";
import { cn } from "@/lib/utils";

export function QuickActionTile({
  href,
  icon,
  label,
  hint,
  accent = "gold",
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  accent?: "gold" | "pitch" | "azure" | "crimson";
}) {
  const accentMap = {
    gold: "text-[var(--gold-300)] bg-[var(--gold-500)]/12",
    pitch: "text-[var(--pitch-400)] bg-[var(--pitch-500)]/12",
    azure: "text-[var(--azure-400)] bg-[var(--azure-500)]/12",
    crimson: "text-[var(--crimson-400)] bg-[var(--crimson-500)]/12",
  };
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3 hover:border-[var(--gold-500)]/40 hover:bg-[var(--bg-raised)] transition"
    >
      <span className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", accentMap[accent])}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[var(--text-hi)] leading-tight">{label}</div>
        {hint && <div className="text-[11px] text-[var(--text-lo)] mt-0.5 truncate">{hint}</div>}
      </div>
    </Link>
  );
}
