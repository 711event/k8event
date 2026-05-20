"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createMatchAction, type MatchFormState } from "./actions";

export function CreateMatchForm({ teams }: { teams: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<MatchFormState, FormData>(
    createMatchAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      toast.success("比赛已创建");
      formRef.current?.reset();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
      <TeamSelect name="homeTeamId" label="主队" teams={teams} />
      <TeamSelect name="awayTeamId" label="客队" teams={teams} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">开赛时间 (GMT+8)</span>
        <input
          name="kickoffLocal"
          type="datetime-local"
          required
          className="h-10 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Token 奖励</span>
        <input
          name="tokenReward"
          type="number"
          min={1}
          defaultValue={100}
          required
          className="h-10 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 font-medium disabled:opacity-60"
      >
        {pending ? "保存中…" : "创建"}
      </button>
    </form>
  );
}

function TeamSelect({
  name,
  label,
  teams,
}: {
  name: string;
  label: string;
  teams: { id: string; name: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        name={name}
        required
        defaultValue=""
        className="h-10 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20"
      >
        <option value="" disabled>
          请选择…
        </option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
