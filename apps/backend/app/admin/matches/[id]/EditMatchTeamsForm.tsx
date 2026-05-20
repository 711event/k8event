"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
  const [homeId, setHomeId] = useState(currentHomeId);
  const [awayId, setAwayId] = useState(currentAwayId);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (homeId === awayId) {
      toast.error("主队和客队不能相同");
      return;
    }
    startTransition(async () => {
      const r = await updateMatchTeamsAction(matchId, homeId, awayId);
      if (r && "error" in r) toast.error(r.error ?? "更新失败");
      else toast.success("✅ 队伍已更新");
    });
  }

  const changed = homeId !== currentHomeId || awayId !== currentAwayId;

  return (
    <div className="rounded-md border border-zinc-200 p-4 space-y-3">
      <div className="text-sm font-medium text-zinc-700">修改参赛队伍</div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">主队</label>
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
          <label className="text-xs text-zinc-500">客队</label>
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
          {pending ? "保存中…" : "保存"}
        </button>
      </div>
      <p className="text-xs text-zinc-400">仅限「待开赛」状态的比赛可修改队伍</p>
    </div>
  );
}
