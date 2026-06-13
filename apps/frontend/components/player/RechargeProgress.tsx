import { cn } from "@k8event/shared/utils";
import { useFeLang } from "./LangProvider";
import { tFe } from "@/lib/i18n";

export function RechargeProgress({
  amount,
  threshold = 500,
  dailyCap,
  predictionChances,
}: {
  amount: number;
  threshold?: number;
  dailyCap?: number;
  predictionChances?: number;
}) {
  const { locale } = useFeLang();
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);

  // New model: 1 chance per `threshold` (per_unit) deposited, capped by dailyCap.
  const perUnit = Math.max(1, threshold);
  const rawToday = Math.floor(amount / perUnit);
  const cap = dailyCap && dailyCap > 0 ? dailyCap : null;
  const todayChances = cap ? Math.min(rawToday, cap) : rawToday;
  const earnedSomething = todayChances > 0;

  // Progress bar: how far today's chances are toward the daily cap.
  // If there's no cap, show progress toward the next whole chance.
  const pct = cap
    ? Math.min(100, Math.round((todayChances / cap) * 100))
    : Math.min(100, Math.round(((amount % perUnit) / perUnit) * 100));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wider text-[var(--text-lo)]">
          {t("recharge_progress_label")}
        </span>
        <span
          className={cn(
            "text-[11px] font-semibold",
            earnedSomething ? "text-[var(--pitch-400)]" : "text-[var(--text-mid)]",
          )}
        >
          RM{amount.toFixed(0)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-raised)]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            earnedSomething
              ? "bg-gradient-to-r from-[var(--pitch-500)] to-[var(--pitch-400)]"
              : "bg-gradient-to-r from-[var(--gold-600)] to-[var(--gold-300)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p
        className={cn(
          "mt-1.5 text-xs",
          earnedSomething ? "text-[var(--pitch-400)]" : "text-[var(--text-mid)]",
        )}
      >
        {cap
          ? t("recharge_progress_today_capped", { unit: perUnit, today: todayChances, cap })
          : t("recharge_progress_today", { unit: perUnit, today: todayChances })}
      </p>

      {/* Accumulated, usable prediction chances (from RPC) */}
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
