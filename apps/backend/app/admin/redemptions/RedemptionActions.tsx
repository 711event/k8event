"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { decideRedemptionAction } from "./actions";
import type { RedemptionStatus } from "@k8event/shared/supabase/types";

const DECIDED_LABEL: Record<"approved" | "fulfilled" | "rejected", string> = {
  approved:  "已批准",
  fulfilled: "已发放",
  rejected:  "已拒绝",
};

export function RedemptionActions({
  id,
  status,
}: {
  id: string;
  status: RedemptionStatus;
}) {
  const [pending, startTransition] = useTransition();

  if (status === "fulfilled" || status === "rejected") {
    return <span className="text-xs text-zinc-500">已完结</span>;
  }

  function decide(next: "approved" | "fulfilled" | "rejected", confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    startTransition(async () => {
      const r = await decideRedemptionAction(id, next);
      if (r && "error" in r) toast.error(r.error);
      else toast.success(DECIDED_LABEL[next]);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "pending" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("approved")}
          className="h-8 px-3 rounded-md border border-foreground/20 text-xs font-medium disabled:opacity-60"
        >
          批准
        </button>
      )}
      {(status === "pending" || status === "approved") && (
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("fulfilled")}
          className="h-8 px-3 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium disabled:opacity-60"
        >
          标记已发放
        </button>
      )}
      {status === "pending" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            decide("rejected", "确认拒绝此申请并退还 Token？")
          }
          className="h-8 px-3 rounded-md border border-red-500/30 text-red-600 text-xs font-medium disabled:opacity-60"
        >
          拒绝（退还Token）
        </button>
      )}
    </div>
  );
}
