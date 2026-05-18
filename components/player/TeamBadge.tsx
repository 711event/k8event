import { cn } from "@/lib/utils";

function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function TeamBadge({
  name,
  logoUrl,
  size = 40,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full bg-[var(--bg-raised)] ring-2 ring-[var(--gold-500)]/30 overflow-hidden flex-shrink-0",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span
          className="font-[family-name:var(--font-display)] font-bold text-[var(--gold-300)] leading-none"
          style={{ fontSize: size * 0.4 }}
        >
          {monogram(name) || "?"}
        </span>
      )}
    </div>
  );
}
