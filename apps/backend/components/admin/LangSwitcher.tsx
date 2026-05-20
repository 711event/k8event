"use client";

import { useLang } from "./LangProvider";

export function LangSwitcher() {
  const { locale, setLocale, isPending } = useLang();
  return (
    <button
      onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
      disabled={isPending}
      className="h-7 px-2.5 rounded text-xs font-semibold border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition disabled:opacity-50 shrink-0"
      title={locale === "zh" ? "Switch to English" : "切换中文"}
    >
      {locale === "zh" ? "EN" : "中"}
    </button>
  );
}
