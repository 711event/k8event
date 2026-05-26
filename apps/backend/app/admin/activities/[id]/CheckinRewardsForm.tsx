"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { updateActivityAction } from "../actions";

interface Props {
  activityId: string;
  settings: Record<string, unknown>;
}

const CYCLE_OPTIONS = [7, 14, 21, 28] as const;
type CycleLength = (typeof CYCLE_OPTIONS)[number];

function buildDefaultRewards(len: CycleLength): number[] {
  // Base 7-day rewards, repeated / extended to fill the cycle
  const base = [5, 8, 10, 12, 15, 20, 30];
  return Array.from({ length: len }, (_, i) => base[i % base.length]);
}

export function CheckinRewardsForm({ activityId, settings }: Props) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  const storedCycle = (settings.cycle_length as number | undefined) ?? 7;
  const initialCycle: CycleLength = (CYCLE_OPTIONS as readonly number[]).includes(storedCycle)
    ? (storedCycle as CycleLength)
    : 7;

  const existingRewards = (settings.day_rewards as number[] | undefined) ?? buildDefaultRewards(initialCycle);
  const [cycleLength, setCycleLength] = useState<CycleLength>(initialCycle);
  const [rewards, setRewards] = useState<number[]>(() => {
    // Ensure rewards array matches cycle length
    if (existingRewards.length >= initialCycle) return existingRewards.slice(0, initialCycle);
    const extended = [...existingRewards];
    while (extended.length < initialCycle) {
      extended.push(extended[extended.length % 7] ?? 5);
    }
    return extended;
  });
  const [resetOnMiss, setResetOnMiss] = useState<boolean>((settings.reset_on_miss as boolean) ?? true);
  const [cycleAfterDayN, setCycleAfterDayN] = useState<boolean>((settings.cycle_after_day7 as boolean) ?? true);
  const [pending, startTransition] = useTransition();

  function handleCycleChange(len: CycleLength) {
    setCycleLength(len);
    // Resize rewards array: preserve existing values, extend or shrink
    setRewards((prev) => {
      if (prev.length === len) return prev;
      if (prev.length > len) return prev.slice(0, len);
      // Extend: repeat base pattern for new slots
      const next = [...prev];
      const base = [5, 8, 10, 12, 15, 20, 30];
      while (next.length < len) {
        next.push(base[next.length % base.length]);
      }
      return next;
    });
  }

  function setDay(idx: number, val: number) {
    const next = [...rewards];
    next[idx] = Math.max(0, val);
    setRewards(next);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await updateActivityAction(activityId, {
        settings: {
          ...settings,
          day_rewards: rewards,
          reset_on_miss: resetOnMiss,
          cycle_after_day7: cycleAfterDayN,
          cycle_length: cycleLength,
        },
      });
      if (r.error) { toast.error(r.error); return; }
      toast.success(t("checkin_rewards_saved"));
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* Cycle length selector */}
      <div>
        <div className="text-sm font-medium mb-2">{t("checkin_cycle_label")}</div>
        <div className="flex gap-2">
          {CYCLE_OPTIONS.map((len) => (
            <button
              key={len}
              type="button"
              onClick={() => handleCycleChange(len)}
              className={
                "h-9 px-4 rounded-md border text-sm font-medium transition " +
                (cycleLength === len
                  ? "bg-zinc-900 border-zinc-900 text-white"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900")
              }
            >
              {t("checkin_cycle_days", { n: len })}
            </button>
          ))}
        </div>
      </div>

      {/* Day reward inputs — 7 per row */}
      <div>
        <div className="text-sm font-medium mb-2">{t("checkin_rewards_daily_label")}</div>
        <div className="grid grid-cols-7 gap-2">
          {rewards.map((val, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-xs text-zinc-500">{t("checkin_rewards_day", { day: i + 1 })}</span>
              <input
                type="number"
                min={0}
                value={val}
                onChange={(e) => setDay(i, Number(e.target.value))}
                className="w-full h-9 px-2 rounded-md border border-zinc-300 bg-white text-sm text-center tabular-nums"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={resetOnMiss}
            onChange={(e) => setResetOnMiss(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          {t("checkin_cycle_reset")}
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={cycleAfterDayN}
            onChange={(e) => setCycleAfterDayN(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          {t("checkin_cycle_loop")}
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium disabled:opacity-60"
      >
        {pending ? t("checkin_rewards_saving") : t("checkin_rewards_save")}
      </button>
    </form>
  );
}
