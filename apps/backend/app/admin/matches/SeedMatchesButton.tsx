"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { seedMatchesAction, resetSeedMatchesAction, seedKnockoutMatchesAction } from "../seed/actions";

export function SeedMatchesButton() {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const [seedPending, startSeed] = useTransition();
  const [knockoutPending, startKnockout] = useTransition();
  const [resetPending, startReset] = useTransition();
  const pending = seedPending || knockoutPending || resetPending;

  function handleSeed() {
    startSeed(async () => {
      const r = await seedMatchesAction();
      if (r && "error" in r) {
        toast.error(r.error);
      } else if (r && "ok" in r) {
        toast.success(t("seed_matches_success", { inserted: r.inserted }));
      }
    });
  }

  function handleReset() {
    if (!confirm(t("seed_reset_confirm"))) return;

    startReset(async () => {
      const r = await resetSeedMatchesAction();
      if (r && "error" in r) {
        toast.error(r.error);
      } else if (r && "ok" in r) {
        toast.success(t("seed_reset_success", { count: r.skipped }));
      }
    });
  }

  function handleKnockout() {
    if (!confirm(t("seed_knockout_confirm"))) return;
    startKnockout(async () => {
      const r = await seedKnockoutMatchesAction();
      if (r && "error" in r) {
        toast.error(r.error);
      } else if (r && "ok" in r) {
        toast.success(t("seed_knockout_success", { inserted: r.inserted }));
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        type="button"
        disabled={pending}
        onClick={handleSeed}
        title={t("seed_matches_btn_hint")}
        className="h-9 px-4 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium disabled:opacity-60 whitespace-nowrap"
      >
        {seedPending ? t("seed_matches_generating") : t("seed_matches_btn")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={handleKnockout}
        title={t("seed_knockout_hint")}
        className="h-9 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium disabled:opacity-60 whitespace-nowrap"
      >
        {knockoutPending ? t("seed_knockout_creating") : t("seed_knockout_btn")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={handleReset}
        title={t("seed_reset_hint")}
        className="h-9 px-4 rounded-md border border-red-500/30 text-red-600 hover:bg-red-50 text-xs font-medium disabled:opacity-60 whitespace-nowrap"
      >
        {resetPending ? t("seed_reset_clearing") : t("seed_reset_btn")}
      </button>
    </div>
  );
}
