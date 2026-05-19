import { cn } from "@k8event/shared/utils";

type Variant = "gold" | "pitch" | "crimson" | "azure" | "neutral";

const variants: Record<Variant, string> = {
  gold: "bg-[var(--gold-500)]/15 text-[var(--gold-300)] ring-1 ring-inset ring-[var(--gold-500)]/30",
  pitch: "bg-[var(--pitch-500)]/15 text-[var(--pitch-400)] ring-1 ring-inset ring-[var(--pitch-500)]/30",
  crimson: "bg-[var(--crimson-500)]/15 text-[var(--crimson-400)] ring-1 ring-inset ring-[var(--crimson-500)]/30",
  azure: "bg-[var(--azure-500)]/15 text-[var(--azure-400)] ring-1 ring-inset ring-[var(--azure-500)]/30",
  neutral: "bg-[var(--bg-raised)] text-[var(--text-mid)] ring-1 ring-inset ring-[var(--border-strong)]",
};

export function Chip({
  variant = "neutral",
  className,
  children,
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide uppercase",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
