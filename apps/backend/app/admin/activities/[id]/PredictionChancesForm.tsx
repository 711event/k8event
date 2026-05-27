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

export function PredictionChancesForm({ activityId, settings }: Props) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  const [minRecharge, setMinRecharge] = useState<number>(
    (settings.min_recharge_amount as number | undefined) ?? 500
  );
  const [chancesPerRecharge, setChancesPerRecharge] = useState<number>(
    (settings.chances_per_recharge as number | undefined) ?? 1
  );
  const [maxChances, setMaxChances] = useState<number>(
    (settings.max_chances as number | undefined) ?? 0
  );
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await updateActivityAction(activityId, {
        settings: {
          ...settings,
          min_recharge_amount: minRecharge,
          chances_per_recharge: chancesPerRecharge,
          max_chances: maxChances,
        },
      });
      if (r.error) { toast.error(r.error); return; }
      toast.success(t("prediction_chances_saved"));
    });
  }

  const effectDesc = locale === "zh"
    ? `玩家当日充值 ≥ RM${minRecharge}，获得 ${chancesPerRecharge} 次竞猜机会，历史累积，上限 ${maxChances === 0 ? "不限" : `${maxChances} 次`}。`
    : `Player daily recharge ≥ RM${minRecharge} earns ${chancesPerRecharge} prediction chance(s), cumulative, max ${maxChances === 0 ? "unlimited" : `${maxChances}`}.`;

  return (
    <form onSubmit={handleSave} className="space-y-5">

      <div className="grid grid-cols-2 gap-4">
        {/* Min recharge */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("prediction_chances_min_recharge")}</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500 font-semibold">RM</span>
            <input
              type="number"
              min={0}
              step={50}
              value={minRecharge}
              onChange={(e) => setMinRecharge(Math.max(0, Number(e.target.value)))}
              className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm tabular-nums"
            />
          </div>
          <p className="text-xs text-zinc-400">{t("prediction_chances_min_recharge_hint")}</p>
        </div>

        {/* Chances per qualifying day */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("prediction_chances_per_day")}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={20}
              value={chancesPerRecharge}
              onChange={(e) => setChancesPerRecharge(Math.max(1, Number(e.target.value)))}
              className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm tabular-nums"
            />
            <span className="text-sm text-zinc-500 whitespace-nowrap">{t("prediction_chances_per_day_unit")}</span>
          </div>
          <p className="text-xs text-zinc-400">{t("prediction_chances_per_day_hint")}</p>
        </div>
      </div>

      {/* Max chances cap */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t("prediction_chances_max")}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={999}
            value={maxChances}
            onChange={(e) => setMaxChances(Math.max(0, Number(e.target.value)))}
            className="w-40 h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm tabular-nums"
          />
          <span className="text-sm text-zinc-500">{t("prediction_chances_max_unit")}</span>
        </div>
        <p className="text-xs text-zinc-400">{t("prediction_chances_max_hint")}</p>
      </div>

      {/* Live preview */}
      <div className="rounded-md bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm text-zinc-600">
        <span className="font-semibold text-zinc-700">{t("prediction_chances_effect_label")}</span>{" "}
        {effectDesc}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium disabled:opacity-60"
      >
        {pending ? t("prediction_chances_saving") : t("prediction_chances_save")}
      </button>
    </form>
  );
}
