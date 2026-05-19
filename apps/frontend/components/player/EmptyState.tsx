import { cn } from "@k8event/shared/utils";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/40",
        className,
      )}
    >
      {icon && <div className="mb-3 text-[var(--text-lo)]">{icon}</div>}
      <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-hi)]">
        {title}
      </h3>
      {body && <p className="mt-1 text-sm text-[var(--text-mid)] max-w-xs">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
