"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { submitPredictionAction, type PredictState } from "./actions";

export function PredictionForm({
  matchId,
  homeName,
  awayName,
  tokenReward,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  tokenReward: number;
}) {
  const [state, formAction, pending] = useActionState<PredictState, FormData>(
    submitPredictionAction,
    undefined,
  );
  const router = useRouter();

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      toast.success("预测已提交!");
      router.refresh();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="matchId" value={matchId} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-[var(--text-lo)]">选择获胜方</div>
          <p className="text-xs text-[var(--text-mid)] mt-0.5">每场只能提交一次,不能修改</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--gold-300)] font-semibold">
          <Coins size={13} />
          <span className="tabular-nums">+{tokenReward}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PickButton pick="home" label={homeName} caption="主队" disabled={pending} />
        <PickButton pick="away" label={awayName} caption="客队" disabled={pending} />
      </div>
    </form>
  );
}

function PickButton({
  pick,
  label,
  caption,
  disabled,
}: {
  pick: "home" | "away";
  label: string;
  caption: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      name="pick"
      value={pick}
      disabled={disabled}
      className="group h-24 sm:h-28 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] flex flex-col items-center justify-center gap-1 hover:border-[var(--gold-500)]/60 hover:bg-[var(--bg-raised)] hover:shadow-[var(--shadow-glow)] active:scale-[0.98] transition disabled:opacity-60 disabled:hover:bg-[var(--bg-elevated)]"
    >
      <span className="text-[10px] uppercase tracking-wider text-[var(--text-lo)] group-hover:text-[var(--gold-300)] transition">
        {caption}
      </span>
      <span className="font-[family-name:var(--font-display)] text-base sm:text-lg font-bold text-[var(--text-hi)] truncate max-w-[90%]">
        {label}
      </span>
    </button>
  );
}
