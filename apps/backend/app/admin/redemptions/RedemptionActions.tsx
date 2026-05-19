"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { decideRedemptionAction } from "./actions";
import type { RedemptionStatus } from "@k8event/shared/supabase/types";

export function RedemptionActions({
  id,
  status,
}: {
  id: string;
  status: RedemptionStatus;
}) {
  const [pending, startTransition] = useTransition();

  if (status === "fulfilled" || status === "rejected") {
    return <span className="text-xs text-zinc-500">finalized</span>;
  }

  function decide(next: "approved" | "fulfilled" | "rejected", confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    startTransition(async () => {
      const r = await decideRedemptionAction(id, next);
      if (r && "error" in r) toast.error(r.error);
      else toast.success(`Marked ${next}`);
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
          Approve
        </button>
      )}
      {(status === "pending" || status === "approved") && (
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("fulfilled")}
          className="h-8 px-3 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium disabled:opacity-60"
        >
          Mark fulfilled
        </button>
      )}
      {status === "pending" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            decide("rejected", "Reject this request and refund tokens?")
          }
          className="h-8 px-3 rounded-md border border-red-500/30 text-red-600 text-xs font-medium disabled:opacity-60"
        >
          Reject (refund)
        </button>
      )}
    </div>
  );
}
