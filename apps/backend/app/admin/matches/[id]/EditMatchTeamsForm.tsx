"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { updateMatchTeamsAction } from "../actions";

export function EditMatchTeamsForm({
  matchId,
  currentHomeId,
  currentAwayId,
  teams,
}: {
  matchId: string;
  currentHomeId: string;
  currentAwayId: string;
  teams: { id: string; name: string; logo_url: string | null }[];
}) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);
  const [homeId, setHomeId] = useState(currentHomeId);
  const [awayId, setAwayId] = useState(currentAwayId);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (homeId === awayId) {
      toast.error(t("match_edit_teams_same_error"));
      return;
    }
    startTransition(async () => {
      const r = await updateMatchTeamsAction(matchId, homeId, awayId);
      if (r && "error" in r) toast.error(r.error ?? t("match_edit_teams_fail"));
      else toast.success(t("match_edit_teams_success"));
    });
  }

  const changed = homeId !== currentHomeId || awayId !== currentAwayId;

  return (
    <div className="rounded-md border border-zinc-200 p-4 space-y-3">
      <div className="text-sm font-medium text-zinc-700">{t("match_edit_teams_title")}</div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">{t("match_edit_teams_home")}</label>
          <select
            value={homeId}
            onChange={(e) => setHomeId(e.target.value)}
            className="h-9 px-2 rounded-md border border-zinc-200 text-sm bg-white min-w-40"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <span className="text-zinc-400 pt-4">vs</span>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">{t("match_edit_teams_away")}</label>
          <select
            value={awayId}
            onChange={(e) => setAwayId(e.target.value)}
            className="h-9 px-2 rounded-md border border-zinc-200 text-sm bg-white min-w-40"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={pending || !changed}
          onClick={handleSave}
          className="h-9 px-4 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium disabled:opacity-50 mt-4 whitespace-nowrap"
        >
          {pending ? t("match_edit_teams_saving") : t("match_edit_teams_save")}
        </button>
      </div>
      <p className="text-xs text-zinc-400">{t("match_edit_teams_hint")}</p>
    </div>
  );
}
