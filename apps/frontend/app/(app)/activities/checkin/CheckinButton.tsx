"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { checkinAction } from "./actions";

interface Props {
  activityId: string;
  checkedInToday: boolean;
  todayTokens: number;
}

export function CheckinButton({ activityId, checkedInToday, todayTokens }: Props) {
  const [pending, startTransition] = useTransition();

  function handleCheckin() {
    startTransition(async () => {
      const r = await checkinAction(activityId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`签到成功！获得 +${r.data?.tokens_awarded} Token 🎉`);
    });
  }

  if (checkedInToday) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-full max-w-xs h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center gap-2">
          <span className="text-2xl">✓</span>
          <span className="text-emerald-400 font-semibold text-base">今日已签到</span>
        </div>
        <p className="text-xs text-zinc-500">明天继续签到保持连续记录</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCheckin}
      disabled={pending}
      className="w-full max-w-xs h-14 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-bold text-base shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "签到中…" : `立即签到 (+${todayTokens} Token)`}
    </button>
  );
}
