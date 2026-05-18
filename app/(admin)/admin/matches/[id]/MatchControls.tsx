"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteMatchAction,
  setMatchStatusAction,
  settleMatchAction,
} from "../actions";
import type { MatchStatus } from "@/lib/supabase/types";

type Result = "home" | "away" | "draw";

export function MatchControls({
  id,
  status,
  homeName,
  awayName,
}: {
  id: string;
  status: MatchStatus;
  homeName: string;
  awayName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<Result | "">("");
  const router = useRouter();

  function run(fn: () => Promise<{ error?: string } | { ok: true } | undefined>, ok: string) {
    startTransition(async () => {
      const r = await fn();
      if (r && "error" in r) toast.error(r.error ?? "Failed");
      else toast.success(ok);
    });
  }

  const settleable = status === "scheduled" || status === "locked";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {status === "scheduled" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setMatchStatusAction(id, "locked"), "Match locked")}
            className="h-10 px-4 rounded-md border border-foreground/20 text-sm font-medium disabled:opacity-60"
          >
            Lock predictions
          </button>
        )}
        {status === "locked" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setMatchStatusAction(id, "scheduled"), "Match unlocked")}
            className="h-10 px-4 rounded-md border border-foreground/20 text-sm font-medium disabled:opacity-60"
          >
            Unlock
          </button>
        )}
        {settleable && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setMatchStatusAction(id, "cancelled"), "Match cancelled")}
            className="h-10 px-4 rounded-md border border-foreground/20 text-sm font-medium disabled:opacity-60"
          >
            Cancel match
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this match? Predictions will be deleted too.")) return;
            startTransition(async () => {
              const r = await deleteMatchAction(id);
              if (r && "error" in r) toast.error(r.error ?? "Failed");
              else {
                toast.success("Match deleted");
                router.push("/admin/matches");
              }
            });
          }}
          className="h-10 px-4 rounded-md border border-red-500/30 text-sm font-medium text-red-600 disabled:opacity-60"
        >
          Delete
        </button>
      </div>

      {settleable && (
        <div className="rounded-md border border-foreground/10 p-4 space-y-3">
          <div className="text-sm font-medium">Enter result and settle</div>
          <div className="flex flex-wrap gap-2">
            <ResultChoice value="home" current={chosen} onPick={setChosen} label={`Home: ${homeName}`} />
            <ResultChoice value="away" current={chosen} onPick={setChosen} label={`Away: ${awayName}`} />
            <ResultChoice value="draw" current={chosen} onPick={setChosen} label="Draw (no awards)" />
          </div>
          <button
            type="button"
            disabled={pending || !chosen}
            onClick={() => {
              if (!chosen) return;
              if (!confirm(`Settle match with result "${chosen}"? This awards tokens to winning predictions and cannot be undone.`)) return;
              run(() => settleMatchAction(id, chosen as Result), "Match settled");
            }}
            className="h-10 px-5 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-60"
          >
            {pending ? "Settling…" : "Settle match"}
          </button>
        </div>
      )}
    </div>
  );
}

function ResultChoice({
  value,
  current,
  onPick,
  label,
}: {
  value: Result;
  current: Result | "";
  onPick: (v: Result) => void;
  label: string;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      className={
        "h-10 px-4 rounded-md border text-sm font-medium transition " +
        (selected
          ? "border-foreground bg-foreground/10"
          : "border-foreground/20 hover:border-foreground/40")
      }
    >
      {label}
    </button>
  );
}
