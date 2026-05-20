"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { seedMatchesAction, resetSeedMatchesAction } from "../seed/actions";

export function SeedMatchesButton() {
  const [seedPending, startSeed] = useTransition();
  const [resetPending, startReset] = useTransition();
  const pending = seedPending || resetPending;

  function handleSeed() {
    startSeed(async () => {
      const r = await seedMatchesAction();
      if (r && "error" in r) {
        toast.error(r.error);
      } else if (r && "ok" in r) {
        toast.success(`✅ 已生成 ${r.inserted} 场小组赛赛程（2026-06-11 起）`);
      }
    });
  }

  function handleReset() {
    if (
      !confirm(
        "确认清除所有 scheduled 比赛？\n\n此操作会删除所有状态为「scheduled」的比赛。已锁定、已结算或已取消的比赛不受影响。",
      )
    )
      return;

    startReset(async () => {
      const r = await resetSeedMatchesAction();
      if (r && "error" in r) {
        toast.error(r.error);
      } else if (r && "ok" in r) {
        toast.success(`已清除 ${r.skipped} 场 scheduled 比赛`);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        type="button"
        disabled={pending}
        onClick={handleSeed}
        title="生成 72 场 WC 2026 小组赛（12 组循环赛，需先 Seed Teams）"
        className="h-9 px-4 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium disabled:opacity-60 whitespace-nowrap"
      >
        {seedPending ? "生成中…" : "⚽ 一键生成世界杯赛程"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={handleReset}
        title="删除所有 scheduled 比赛（方便重新 Seed）"
        className="h-9 px-4 rounded-md border border-red-500/30 text-red-600 hover:bg-red-50 text-xs font-medium disabled:opacity-60 whitespace-nowrap"
      >
        {resetPending ? "清除中…" : "🗑 清除已排期比赛"}
      </button>
    </div>
  );
}
