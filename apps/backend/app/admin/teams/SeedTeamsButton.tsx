"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { seedTeamsAction, resetAndSeedTeamsAction } from "../seed/actions";

export function SeedTeamsButton() {
  const [pending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      const r = await seedTeamsAction();
      if (r && "error" in r) {
        toast.error(r.error);
      } else if (r && "ok" in r) {
        if (r.inserted === 0) {
          toast.success(`48 支球队已是最新，无需重复插入`);
        } else {
          toast.success(`✅ 新增 ${r.inserted} 支球队${r.skipped > 0 ? `，跳过 ${r.skipped} 支已存在` : ""}`);
        }
      }
    });
  }

  function handleReset() {
    if (!confirm("⚠️ 将删除所有球队并重新导入 48 支正确球队。\n请先确认已清除所有比赛！\n\n继续？")) return;
    startTransition(async () => {
      const r = await resetAndSeedTeamsAction();
      if (r && "error" in r) {
        toast.error(r.error);
      } else if (r && "ok" in r) {
        toast.success(`✅ 已重置并导入 ${r.inserted} 支世界杯 2026 球队`);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={handleSeed}
        title="仅新增缺少的球队，不影响已有球队"
        className="h-9 px-4 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium disabled:opacity-60 whitespace-nowrap"
      >
        {pending ? "处理中…" : "🌍 导入世界杯球队"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={handleReset}
        title="删除所有旧球队，重新导入 48 支正确球队（需先清除比赛）"
        className="h-9 px-4 rounded-md border border-red-300 text-red-600 hover:bg-red-50 text-xs font-medium disabled:opacity-60 whitespace-nowrap"
      >
        {pending ? "处理中…" : "🔄 重置球队数据"}
      </button>
    </div>
  );
}
