"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteMatchAction,
  setMatchStatusAction,
  settleMatchAction,
} from "../actions";
import type { MatchStatus } from "@k8event/shared/supabase/types";

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
      if (r && "error" in r) toast.error(r.error ?? "操作失败");
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
            onClick={() => run(() => setMatchStatusAction(id, "locked"), "已锁定竞猜")}
            className="h-10 px-4 rounded-md border border-foreground/20 text-sm font-medium disabled:opacity-60"
          >
            锁定竞猜
          </button>
        )}
        {status === "locked" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setMatchStatusAction(id, "scheduled"), "已解锁竞猜")}
            className="h-10 px-4 rounded-md border border-foreground/20 text-sm font-medium disabled:opacity-60"
          >
            解锁竞猜
          </button>
        )}
        {settleable && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setMatchStatusAction(id, "cancelled"), "比赛已取消")}
            className="h-10 px-4 rounded-md border border-foreground/20 text-sm font-medium disabled:opacity-60"
          >
            取消比赛
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("确认删除此比赛？相关竞猜记录也将一并删除。")) return;
            startTransition(async () => {
              const r = await deleteMatchAction(id);
              if (r && "error" in r) toast.error(r.error ?? "操作失败");
              else {
                toast.success("比赛已删除");
                router.push("/admin/matches");
              }
            });
          }}
          className="h-10 px-4 rounded-md border border-red-500/30 text-sm font-medium text-red-600 disabled:opacity-60"
        >
          删除比赛
        </button>
      </div>

      {settleable && (
        <div className="rounded-md border border-zinc-200 p-4 space-y-3">
          <div className="text-sm font-medium">选择结果并结算</div>
          <div className="flex flex-wrap gap-2">
            <ResultChoice value="home" current={chosen} onPick={setChosen} label={`主队胜：${homeName}`} />
            <ResultChoice value="away" current={chosen} onPick={setChosen} label={`客队胜：${awayName}`} />
            <ResultChoice value="draw" current={chosen} onPick={setChosen} label="平局（不发放奖励）" />
          </div>
          <button
            type="button"
            disabled={pending || !chosen}
            onClick={() => {
              if (!chosen) return;
              if (!confirm(`确认以"${chosen === "home" ? "主队胜" : chosen === "away" ? "客队胜" : "平局"}"结算此比赛？Token 将发放给预测正确的玩家，此操作不可撤销。`)) return;
              run(() => settleMatchAction(id, chosen as Result), "比赛已结算");
            }}
            className="h-10 px-5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium disabled:opacity-60"
          >
            {pending ? "结算中…" : "确认结算"}
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
