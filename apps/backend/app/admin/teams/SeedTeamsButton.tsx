"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { seedTeamsAction, resetAndSeedTeamsAction } from "../seed/actions";

export function SeedTeamsButton() {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const [pending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      const r = await seedTeamsAction();
      if (r && "error" in r) {
        toast.error(r.error);
      } else if (r && "ok" in r) {
        if (r.inserted === 0) {
          toast.success(t("seed_teams_up_to_date"));
        } else {
          const skipped_msg = r.skipped > 0 ? (locale === "zh" ? `，跳过 ${r.skipped} 支已存在` : `, skipped ${r.skipped} existing`) : "";
          toast.success(t("seed_teams_inserted", { inserted: r.inserted, skipped_msg }));
        }
      }
    });
  }

  function handleReset() {
    if (!confirm(t("seed_teams_reset_confirm"))) return;
    startTransition(async () => {
      const r = await resetAndSeedTeamsAction();
      if (r && "error" in r) {
        toast.error(r.error);
      } else if (r && "ok" in r) {
        toast.success(t("seed_teams_reset_success", { inserted: r.inserted }));
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={handleSeed}
        title={t("seed_teams_import_hint")}
        className="h-9 px-4 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium disabled:opacity-60 whitespace-nowrap"
      >
        {pending ? t("seed_teams_importing") : t("seed_teams_import_btn")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={handleReset}
        title={t("seed_teams_reset_hint")}
        className="h-9 px-4 rounded-md border border-red-300 text-red-600 hover:bg-red-50 text-xs font-medium disabled:opacity-60 whitespace-nowrap"
      >
        {pending ? t("seed_teams_importing") : t("seed_teams_reset_btn")}
      </button>
    </div>
  );
}
