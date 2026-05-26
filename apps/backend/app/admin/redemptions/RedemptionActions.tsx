"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { decideRedemptionAction } from "./actions";
import type { RedemptionStatus } from "@k8event/shared/supabase/types";

export function RedemptionActions({
  id,
  status,
}: {
  id: string;
  status: RedemptionStatus;
}) {
  const { locale } = useLang();
  const [pending, startTransition] = useTransition();

  if (status === "fulfilled" || status === "rejected") {
    return <span className="text-xs text-zinc-500">{tBo(locale, "redemption_completed")}</span>;
  }

  function decide(next: "approved" | "fulfilled" | "rejected", confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    startTransition(async () => {
      const r = await decideRedemptionAction(id, next);
      if (r && "error" in r) toast.error(r.error);
      else {
        const labelMap: Record<"approved" | "fulfilled" | "rejected", string> = {
          approved:  tBo(locale, "redemption_status_approved"),
          fulfilled: tBo(locale, "redemption_status_fulfilled"),
          rejected:  tBo(locale, "redemption_status_rejected"),
        };
        toast.success(labelMap[next]);
      }
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
          {tBo(locale, "redemption_approve")}
        </button>
      )}
      {(status === "pending" || status === "approved") && (
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("fulfilled")}
          className="h-8 px-3 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium disabled:opacity-60"
        >
          {tBo(locale, "redemption_fulfil")}
        </button>
      )}
      {status === "pending" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            decide("rejected", tBo(locale, "redemption_reject_confirm"))
          }
          className="h-8 px-3 rounded-md border border-red-500/30 text-red-600 text-xs font-medium disabled:opacity-60"
        >
          {tBo(locale, "redemption_reject")}
        </button>
      )}
    </div>
  );
}
