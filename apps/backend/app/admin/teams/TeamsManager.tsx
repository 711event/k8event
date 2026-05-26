"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { createTeamAction, deleteTeamAction, type TeamFormState } from "./actions";

type Team = {
  id: string;
  name: string;
  short_code: string | null;
  logo_url: string | null;
};

export function TeamsManager({ teams }: { teams: Team[] }) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const [state, formAction, pending] = useActionState<TeamFormState, FormData>(
    createTeamAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      toast.success(t("teams_created"));
      formRef.current?.reset();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <>
      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-medium mb-3">{t("teams_add")}</h2>
        <form ref={formRef} action={formAction} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <Field name="name" label={t("teams_field_name")} placeholder={t("teams_field_name_hint")} />
          <Field name="shortCode" label={t("teams_field_short")} placeholder="ARG" required={false} />
          <Field name="logoUrl" label={t("teams_field_logo")} placeholder="https://..." required={false} />
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 font-medium disabled:opacity-60"
          >
            {pending ? t("teams_saving") : t("teams_add_btn")}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{t("teams_col_name")}</th>
              <th className="px-4 py-3 font-medium">{t("teams_col_short")}</th>
              <th className="px-4 py-3 font-medium">{t("teams_col_logo")}</th>
              <th className="px-4 py-3 font-medium w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {teams.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-zinc-500">{t("teams_empty")}</td></tr>
            ) : (
              teams.map((team) => <TeamRow key={team.id} team={team} locale={locale} />)
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

function TeamRow({ team, locale }: { team: Team; locale: Parameters<typeof tBo>[0] }) {
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td className="px-4 py-3">{team.name}</td>
      <td className="px-4 py-3 font-mono text-zinc-500">{team.short_code ?? "—"}</td>
      <td className="px-4 py-3">
        {team.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo_url} alt="" className="h-6 w-6 rounded-sm object-contain" />
        ) : (
          <span className="text-zinc-500">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(t("teams_delete_confirm", { name: team.name }))) return;
            startTransition(async () => {
              const r = await deleteTeamAction(team.id);
              if (r && "error" in r) toast.error(r.error);
              else toast.success(t("teams_deleted"));
            });
          }}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          {t("teams_delete_btn")}
        </button>
      </td>
    </tr>
  );
}

function Field({
  name,
  label,
  placeholder,
  required = true,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type="text"
        placeholder={placeholder}
        required={required}
        className="h-10 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20"
      />
    </label>
  );
}
