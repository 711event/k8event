import { cn } from "@/lib/utils";

export function StatBubble({
  label,
  value,
  hint,
  icon,
  accent = "gold",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  accent?: "gold" | "pitch" | "azure";
  className?: string;
}) {
  const accentMap = {
    gold: "from-[var(--gold-500)]/20 to-[var(--gold-500)]/0 text-[var(--gold-300)]",
    pitch: "from-[var(--pitch-500)]/20 to-[var(--pitch-500)]/0 text-[var(--pitch-400)]",
    azure: "from-[var(--azure-500)]/20 to-[var(--azure-500)]/0 text-[var(--azure-400)]",
  };
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4",
        className,
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className={cn(
          "absolute -top-10 -right-10 h-24 w-24 rounded-full blur-2xl bg-gradient-to-br",
          accentMap[accent],
        )}
      />
      {icon && <div className={cn("relative mb-2", accentMap[accent])}>{icon}</div>}
      <div className="relative text-[11px] uppercase tracking-wider text-[var(--text-lo)]">{label}</div>
      <div className="relative mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-hi)] tabular-nums">
        {value}
      </div>
      {hint && <div className="relative mt-1 text-xs text-[var(--text-lo)]">{hint}</div>}
    </div>
  );
}
