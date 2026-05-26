"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { createMatchAction, type MatchFormState } from "./actions";

export function CreateMatchForm({ teams }: { teams: { id: string; name: string }[] }) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);
  const [state, formAction, pending] = useActionState<MatchFormState, FormData>(
    createMatchAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      toast.success(t("match_create_success"));
      formRef.current?.reset();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
      <TeamSelect name="homeTeamId" label={t("match_create_home")} teams={teams} placeholder={t("match_create_select")} />
      <TeamSelect name="awayTeamId" label={t("match_create_away")} teams={teams} placeholder={t("match_create_select")} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t("match_create_kickoff")}</span>
        <input
          name="kickoffLocal"
          type="datetime-local"
          required
          className="h-10 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t("match_create_reward")}</span>
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
        {pending ? t("match_create_saving") : t("match_create_btn")}
      </button>
    </form>
  );
}

function TeamSelect({
  name,
  label,
  teams,
  placeholder,
}: {
  name: string;
  label: string;
  teams: { id: string; name: string }[];
  placeholder: string;
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
          {placeholder}
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
