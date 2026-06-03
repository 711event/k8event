"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { seedTeamsAction, resetAndSeedTeamsAction } from "../seed/actions";

function LockGate({ locale, onUnlock }: { locale: string; onUnlock: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === "Mp996996") { onUnlock(); }
    else { setErr(true); setPw(""); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <input
        type="password"
        value={pw}
        onChange={(e) => { setPw(e.target.value); setErr(false); }}
        placeholder={locale === "zh" ? "输入密码解锁" : "Enter password to unlock"}
        className={
          "h-9 px-3 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-zinc-400 w-44 " +
          (err ? "border-red-400 bg-red-50" : "border-zinc-300")
        }
      />
      <button type="submit" className="h-9 px-3 text-sm rounded-md bg-zinc-800 text-white hover:bg-zinc-700">
        {locale === "zh" ? "解锁" : "Unlock"}
      </button>
      {err && <span className="text-xs text-red-500">{locale === "zh" ? "密码错误" : "Wrong password"}</span>}
    </form>
  );
}

export function SeedTeamsButton() {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const [pending, startTransition] = useTransition();
  const [unlocked, setUnlocked] = useState(false);

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

  if (!unlocked) {
    return <LockGate locale={locale} onUnlock={() => setUnlocked(true)} />;
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
