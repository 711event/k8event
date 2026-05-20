"use client";

import { useFeLang } from "./LangProvider";
import type { FeLocale } from "@/lib/i18n";
import { cn } from "@k8event/shared/utils";

const LOCALES: { key: FeLocale; label: string }[] = [
  { key: "zh", label: "中" },
  { key: "en", label: "EN" },
  { key: "ms", label: "BM" },
];

export function LangSwitcher() {
  const { locale, setLocale, isPending } = useFeLang();

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5">
      {LOCALES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setLocale(key)}
          disabled={isPending}
          className={cn(
            "h-6 px-2 rounded-full text-[11px] font-semibold transition disabled:opacity-50",
            locale === key
              ? "bg-[var(--gold-500)] text-[var(--text-on-gold)] shadow-sm"
              : "text-[var(--text-lo)] hover:text-[var(--text-mid)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
