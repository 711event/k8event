import Link from "next/link";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  hint,
  href,
  hrefLabel = "查看全部",
  className,
}: {
  title: string;
  hint?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3 px-1", className)}>
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-hi)] tracking-tight">
          {title}
        </h2>
        {hint && <p className="text-xs text-[var(--text-lo)] mt-0.5">{hint}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="text-xs font-medium text-[var(--gold-300)] hover:text-[var(--gold-500)] transition-colors whitespace-nowrap"
        >
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}
