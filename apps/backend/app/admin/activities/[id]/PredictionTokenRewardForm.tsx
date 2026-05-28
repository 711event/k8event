"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { updatePredictionTokenRewardAction } from "../actions";

interface Props {
  activityId: string;
  settings: Record<string, unknown>;
}

export function PredictionTokenRewardForm({ activityId, settings }: Props) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);

  const [tokenReward, setTokenReward] = useState<number>(
    (settings.prediction_token_reward as number | undefined) ?? 10
  );
  const [syncMatches, setSyncMatches] = useState(true);
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await updatePredictionTokenRewardAction(activityId, tokenReward, syncMatches);
      if (r.error) { toast.error(r.error); return; }
      if (syncMatches && r.updated !== undefined) {
        toast.success(
          locale === "zh"
            ? `已保存，并更新了 ${r.updated} 场待开赛比赛`
            : `Saved. Updated ${r.updated} scheduled match(es).`
        );
      } else {
        toast.success(locale === "zh" ? "已保存" : "Saved");
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {locale === "zh" ? "竞猜正确奖励 Token" : "Token Reward per Correct Prediction"}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={9999}
            value={tokenReward}
            onChange={(e) => setTokenReward(Math.max(1, Number(e.target.value)))}
            className="w-32 h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm tabular-nums"
          />
          <span className="text-sm text-zinc-500">Token</span>
        </div>
        <p className="text-xs text-zinc-400">
          {locale === "zh"
            ? "玩家竞猜结果正确时获得的 Token 数量"
            : "Tokens awarded to players who predict the correct match result"}
        </p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={syncMatches}
          onChange={(e) => setSyncMatches(e.target.checked)}
          className="accent-amber-500 w-4 h-4"
        />
        <span className="text-sm text-zinc-700">
          {locale === "zh"
            ? "同步更新所有「待开赛」场次的奖励"
            : "Apply to all scheduled matches now"}
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium disabled:opacity-60"
      >
        {pending
          ? (locale === "zh" ? "保存中…" : "Saving…")
          : (locale === "zh" ? "保存奖励设置" : "Save Reward Settings")}
      </button>
    </form>
  );
}
