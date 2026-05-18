"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitPredictionAction, type PredictState } from "./actions";

export function PredictionForm({
  matchId,
  homeName,
  awayName,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
}) {
  const [state, formAction, pending] = useActionState<PredictState, FormData>(
    submitPredictionAction,
    undefined,
  );
  const router = useRouter();

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      toast.success("Prediction submitted!");
      router.refresh();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="matchId" value={matchId} />
      <p className="text-sm text-zinc-500">Pick the winner — you can only submit once.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PickButton pick="home" label={homeName} disabled={pending} />
        <PickButton pick="away" label={awayName} disabled={pending} />
      </div>
    </form>
  );
}

function PickButton({
  pick,
  label,
  disabled,
}: {
  pick: "home" | "away";
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      name="pick"
      value={pick}
      disabled={disabled}
      className="h-20 rounded-lg border border-foreground/15 hover:border-foreground hover:bg-foreground/[0.04] active:scale-[0.98] transition text-lg font-semibold disabled:opacity-60 disabled:hover:bg-transparent"
    >
      {label}
    </button>
  );
}
