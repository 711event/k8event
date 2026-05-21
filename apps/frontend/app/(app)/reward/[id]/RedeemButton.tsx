"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { redeemAction } from "./actions";
import { tFe } from "@/lib/i18n";
import type { FeLocale } from "@/lib/i18n";

export function RedeemButton({
  id,
  name,
  cost,
  locale,
}: {
  id: string;
  name: string;
  cost: number;
  locale: FeLocale;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const t = (k: Parameters<typeof tFe>[1]) => tFe(locale, k);

  if (confirming) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--gold-500)]/40 bg-[var(--bg-elevated)] p-4 space-y-3">
        <p className="text-sm text-[var(--text-hi)]">
          {t("redeem_confirm_pre")}{" "}
          <span className="font-bold text-[var(--gold-300)]">{cost.toLocaleString()}</span>{" "}
          {t("redeem_confirm_mid")}{" "}
          <span className="font-semibold">{name}</span>
          {t("redeem_confirm_q")}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="flex-1 h-10 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-raised)] text-[var(--text-hi)] text-sm font-medium hover:bg-[var(--bg-elevated)] disabled:opacity-60"
          >
            {t("redeem_cancel")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const r = await redeemAction(id);
                if (r && "error" in r) {
                  toast.error(r.error);
                  setConfirming(false);
                  return;
                }
                toast.success(t("redeem_success"));
                router.push("/redemptions");
              });
            }}
            className="flex-1 h-10 rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-sm font-bold hover:brightness-110 disabled:opacity-60 transition"
          >
            {pending ? t("redeem_submitting") : t("redeem_confirm_btn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-sm font-bold hover:brightness-110 hover:shadow-[var(--shadow-glow)] active:scale-[0.98] transition"
    >
      <Coins size={16} />
      {t("redeem_cta")} · {cost.toLocaleString()}
    </button>
  );
}
