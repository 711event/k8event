"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { seedTeamsAction } from "../seed/actions";

export function SeedTeamsButton() {
  const [pending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      const r = await seedTeamsAction();
      if (r && "error" in r) {
        toast.error(r.error);
      } else if (r && "ok" in r) {
        if (r.inserted === 0) {
          toast.success(`48 支队伍已存在，无需重复插入`);
        } else {
          toast.success(
            `✅ 新增 ${r.inserted} 支队伍${r.skipped > 0 ? `，跳过 ${r.skipped} 支已存在` : ""}`,
          );
        }
      }
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleSeed}
      title="一键插入 48 支 World Cup 2026 参赛队（含国旗）"
      className="h-9 px-4 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium disabled:opacity-60 whitespace-nowrap"
    >
      {pending ? "插入中…" : "🌍 一键导入世界杯球队"}
    </button>
  );
}
