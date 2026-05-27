"use client";

import { useActionState, useState } from "react";
import { approveReferralAction, rejectReferralAction, type ApproveState } from "./actions";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";

interface Props {
  requestId: string;
  suggestedUsername: string;
}

export function ApproveForm({ requestId, suggestedUsername }: Props) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);
  const [state, action, pending] = useActionState<ApproveState, FormData>(approveReferralAction, undefined);
  const [rejecting, setRejecting] = useState(false);

  if (state && "ok" in state) {
    return (
      <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 space-y-1">
        <p className="font-semibold">{t("referral_approved_title")}</p>
        <p>{t("referral_approved_username")}: <span className="font-mono font-bold">{state.username}</span></p>
        <p>{t("referral_approved_password")}: <span className="font-mono font-bold">{state.password}</span></p>
        <p className="text-emerald-600">{t("referral_approved_note")}</p>
      </div>
    );
  }

  async function handleReject() {
    if (!confirm(t("referral_reject_confirm"))) return;
    setRejecting(true);
    await rejectReferralAction(requestId);
    setRejecting(false);
  }

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="flex items-center gap-2">
        <input
          name="username"
          defaultValue={suggestedUsername}
          placeholder={t("referral_approve_username_placeholder")}
          className="flex-1 h-8 px-2 rounded border border-zinc-300 text-xs outline-none focus:ring-1 focus:ring-amber-400"
        />
        <input
          name="displayName"
          placeholder={t("referral_approve_display_placeholder")}
          className="flex-1 h-8 px-2 rounded border border-zinc-300 text-xs outline-none focus:ring-1 focus:ring-amber-400"
        />
      </div>
      {state && "error" in state && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-7 px-3 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60 transition"
        >
          {pending ? t("referral_approving") : t("referral_approve")}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={rejecting || pending}
          className="h-7 px-3 rounded bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 text-xs font-semibold disabled:opacity-60 transition"
        >
          {rejecting ? t("referral_rejecting") : t("referral_reject")}
        </button>
      </div>
    </form>
  );
}
