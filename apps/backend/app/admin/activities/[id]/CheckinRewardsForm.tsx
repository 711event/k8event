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

const DEFAULT_REWARDS = [5, 8, 10, 12, 15, 20, 30];

export function CheckinRewardsForm({ activityId, settings }: Props) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  const existingRewards = (settings.day_rewards as number[] | undefined) ?? DEFAULT_REWARDS;
  const [rewards, setRewards] = useState<number[]>(existingRewards);
  const [resetOnMiss, setResetOnMiss] = useState<boolean>((settings.reset_on_miss as boolean) ?? true);
  const [cycleAfterDay7, setCycleAfterDay7] = useState<boolean>((settings.cycle_after_day7 as boolean) ?? true);
  const [pending, startTransition] = useTransition();

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
          day_rewards: rewards,
          reset_on_miss: resetOnMiss,
          cycle_after_day7: cycleAfterDay7,
        },
      });
      if (r.error) { toast.error(r.error); return; }
      toast.success(t("checkin_rewards_saved"));
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div>
        <div className="text-sm font-medium mb-2">{t("checkin_rewards_daily_label")}</div>
        <div className="grid grid-cols-7 gap-2">
          {rewards.slice(0, 7).map((val, i) => (
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
          {t("checkin_rewards_reset")}
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={cycleAfterDay7}
            onChange={(e) => setCycleAfterDay7(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          {t("checkin_rewards_cycle")}
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
