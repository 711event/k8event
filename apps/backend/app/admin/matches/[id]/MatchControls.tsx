"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ResultChoice value="home" current={chosen} onPick={setChosen} label={`主队胜`} sublabel={homeName} color="blue" />
            <ResultChoice value="away" current={chosen} onPick={setChosen} label={`客队胜`} sublabel={awayName} color="green" />
            <ResultChoice value="draw" current={chosen} onPick={setChosen} label="平局" sublabel="不发放奖励" color="amber" />
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

const colorMap = {
  blue:  { ring: "ring-2 ring-blue-500 border-blue-500 bg-blue-50",   idle: "border-zinc-200 hover:border-blue-300 hover:bg-blue-50/50",  check: "text-blue-600"  },
  green: { ring: "ring-2 ring-green-500 border-green-500 bg-green-50", idle: "border-zinc-200 hover:border-green-300 hover:bg-green-50/50", check: "text-green-600" },
  amber: { ring: "ring-2 ring-amber-500 border-amber-500 bg-amber-50", idle: "border-zinc-200 hover:border-amber-300 hover:bg-amber-50/50", check: "text-amber-600" },
};

function ResultChoice({
  value,
  current,
  onPick,
  label,
  sublabel,
  color,
}: {
  value: Result;
  current: Result | "";
  onPick: (v: Result) => void;
  label: string;
  sublabel: string;
  color: keyof typeof colorMap;
}) {
  const selected = current === value;
  const c = colorMap[color];
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      className={
        "relative flex flex-col items-center justify-center gap-0.5 rounded-lg border p-3 text-sm font-medium transition cursor-pointer select-none " +
        (selected ? c.ring : c.idle)
      }
    >
      {selected && (
        <CheckCircle2 size={15} className={`absolute top-2 right-2 ${c.check}`} />
      )}
      <span className="font-semibold">{label}</span>
      <span className="text-xs text-zinc-500 font-normal truncate max-w-full">{sublabel}</span>
    </button>
  );
}
