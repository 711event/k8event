"use client";

import { useState, useTransition } from "react";
import { deleteReferralRequestAction } from "./actions";

export function DeleteRequestButton({ requestId }: { requestId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteReferralRequestAction(requestId);
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-red-600 font-medium">确定删除?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs px-2 py-0.5 rounded bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-60 transition"
        >
          {isPending ? "…" : "删除"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-xs px-2 py-0.5 rounded bg-zinc-200 text-zinc-600 hover:bg-zinc-300 disabled:opacity-60 transition"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs px-2 py-0.5 rounded border border-red-200 text-red-500 hover:bg-red-50 transition"
    >
      删除
    </button>
  );
}
