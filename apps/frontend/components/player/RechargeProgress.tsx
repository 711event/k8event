import { cn } from "@k8event/shared/utils";

export function RechargeProgress({
  amount,
  threshold = 500,
}: {
  amount: number;
  threshold?: number;
}) {
  const eligible = amount >= threshold;
  const pct = Math.min(100, Math.round((amount / threshold) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wider text-[var(--text-lo)]">今日充值资格</span>
        <span
          className={cn(
            "text-[11px] font-semibold",
            eligible ? "text-[var(--pitch-400)]" : "text-[var(--text-mid)]",
          )}
        >
          {amount.toFixed(0)} / {threshold}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-raised)]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            eligible
              ? "bg-gradient-to-r from-[var(--pitch-500)] to-[var(--pitch-400)]"
              : "bg-gradient-to-r from-[var(--gold-600)] to-[var(--gold-300)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-xs",
          eligible ? "text-[var(--pitch-400)]" : "text-[var(--text-mid)]",
        )}
      >
        {eligible
          ? "✓ 已满足今日竞猜资格"
          : `再充值 ${(threshold - amount).toFixed(0)} 即可参与今日竞猜`}
      </p>
    </div>
  );
}
