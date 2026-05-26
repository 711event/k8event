"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
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
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<Result | "">("");
  const router = useRouter();

  function run(fn: () => Promise<{ error?: string } | { ok: true } | undefined>, ok: string) {
    startTransition(async () => {
      const r = await fn();
      if (r && "error" in r) toast.error(r.error ?? t("match_controls_op_failed"));
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
            onClick={() => run(() => setMatchStatusAction(id, "locked"), t("match_controls_locked"))}
            className="h-10 px-4 rounded-md border border-foreground/20 text-sm font-medium disabled:opacity-60"
          >
            {t("match_controls_lock")}
          </button>
        )}
        {status === "locked" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setMatchStatusAction(id, "scheduled"), t("match_controls_unlocked"))}
            className="h-10 px-4 rounded-md border border-foreground/20 text-sm font-medium disabled:opacity-60"
          >
            {t("match_controls_unlock")}
          </button>
        )}
        {settleable && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setMatchStatusAction(id, "cancelled"), t("match_controls_cancelled"))}
            className="h-10 px-4 rounded-md border border-foreground/20 text-sm font-medium disabled:opacity-60"
          >
            {t("match_controls_cancel")}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(t("match_controls_delete_confirm"))) return;
            startTransition(async () => {
              const r = await deleteMatchAction(id);
              if (r && "error" in r) toast.error(r.error ?? t("match_controls_op_failed"));
              else {
                toast.success(t("match_controls_deleted"));
                router.push("/admin/matches");
              }
            });
          }}
          className="h-10 px-4 rounded-md border border-red-500/30 text-sm font-medium text-red-600 disabled:opacity-60"
        >
          {t("match_controls_delete")}
        </button>
      </div>

      {settleable && (
        <div className="rounded-md border border-zinc-200 p-4 space-y-3">
          <div className="text-sm font-medium">{t("match_controls_settle_title")}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ResultChoice value="home" current={chosen} onPick={setChosen} label={t("match_result_home")} sublabel={homeName} color="blue" />
            <ResultChoice value="away" current={chosen} onPick={setChosen} label={t("match_result_away")} sublabel={awayName} color="green" />
            <ResultChoice value="draw" current={chosen} onPick={setChosen} label={t("match_result_draw")} sublabel={t("match_controls_draw_sublabel")} color="amber" />
          </div>
          <button
            type="button"
            disabled={pending || !chosen}
            onClick={() => {
              if (!chosen) return;
              const resultLabel = chosen === "home" ? t("match_result_home") : chosen === "away" ? t("match_result_away") : t("match_result_draw");
              if (!confirm(t("match_controls_settle_confirm", { result: resultLabel }))) return;
              run(() => settleMatchAction(id, chosen as Result), t("match_controls_settled"));
            }}
            className="h-10 px-5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium disabled:opacity-60"
          >
            {pending ? t("match_controls_settling") : t("match_controls_settle_btn")}
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
