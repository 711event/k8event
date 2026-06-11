import { cn } from "@k8event/shared/utils";
import { useFeLang } from "./LangProvider";
import { tFe } from "@/lib/i18n";

export function RechargeProgress({
  amount,
  threshold = 500,
  predictionChances,
}: {
  amount: number;
  threshold?: number;
  predictionChances?: number;
}) {
  const { locale } = useFeLang();
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);

  const eligible = amount >= threshold;
  const pct = Math.min(100, Math.round((amount / threshold) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wider text-[var(--text-lo)]">
          {t("recharge_progress_label")}
        </span>
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
          "mt-1.5 text-xs",
          eligible ? "text-[var(--pitch-400)]" : "text-[var(--text-mid)]",
        )}
      >
        {eligible
          ? t("recharge_progress_eligible")
          : t("recharge_progress_hint", { n: (threshold - amount).toFixed(0) })}
      </p>

      {/* Accumulated prediction chances */}
      {predictionChances !== undefined && (
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-lo)]">
            {t("recharge_progress_chances")}
          </span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              predictionChances > 0 ? "text-[var(--gold-300)]" : "text-[var(--text-mid)]",
            )}
          >
            {predictionChances > 0
              ? locale === "zh"
                ? `${predictionChances} 次`
                : `${predictionChances}`
              : t("recharge_progress_none")}
          </span>
        </div>
      )}
    </div>
  );
}
