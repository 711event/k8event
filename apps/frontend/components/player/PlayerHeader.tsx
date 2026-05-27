import Link from "next/link";
import type { FeLocale } from "@/lib/i18n";
import { tFe } from "@/lib/i18n";
import { AvatarMenu } from "./AvatarMenu";
import { LangSwitcher } from "./LangSwitcher";

interface Props {
  locale: FeLocale;
  user: { displayName: string; username: string | null } | null;
  branding: { company_name: string; logo_url: string | null };
  tokenBalance: number | null;
}

export function PlayerHeader({ locale, user, branding, tokenBalance }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/85 backdrop-blur-md">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/activities/checkin" className="flex items-center gap-2">
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={branding.company_name} className="h-10 w-auto object-contain max-w-[160px]" />
          ) : (
            <>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gold-300)] to-[var(--gold-600)] font-[family-name:var(--font-display)] text-[var(--text-on-gold)] font-bold text-[11px] tracking-tight">
                711
              </span>
              <span className="font-[family-name:var(--font-display)] font-bold text-[var(--text-hi)] tracking-tight">
                {branding.company_name}
              </span>
            </>
          )}
        </Link>

        <div className="flex items-center gap-2">
          <LangSwitcher />
          {user && tokenBalance !== null ? (
            <Link
              href="/tokens"
              className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-[var(--gold-500)]/40 bg-[var(--gold-500)]/10 hover:bg-[var(--gold-500)]/20 transition group"
            >
              <span className="text-base leading-none">🪙</span>
              <span className="font-[family-name:var(--font-display)] font-bold text-[var(--gold-300)] text-sm tabular-nums group-hover:text-[var(--gold-200)] transition">
                {tokenBalance}
              </span>
              <span className="text-[10px] font-semibold text-[var(--gold-500)] uppercase tracking-wider hidden sm:inline">
                Token
              </span>
            </Link>
          ) : !user ? (
            <Link
              href="/login"
              className="h-9 px-4 inline-flex items-center rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-sm font-semibold shadow-[0_0_0_1px_rgba(255,200,87,.4)] hover:brightness-110 transition"
            >
              {tFe(locale, "header_login")}
            </Link>
          ) : null}

          {user ? (
            <AvatarMenu displayName={user.displayName} username={user.username ?? ""} locale={locale} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
