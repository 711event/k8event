"use client";

import { useActionState } from "react";
import { signInAction } from "./actions";
import { tBo, type BoLocale } from "@/lib/i18n";

export function LoginForm({ locale = "zh" }: { locale?: BoLocale }) {
  const [state, formAction, pending] = useActionState(signInAction, undefined);
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="username" className="text-xs uppercase tracking-wider text-[var(--text-lo)]">
          {t("login_username_label")}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
          className="w-full h-11 px-3 rounded-md border border-[var(--border-strong)] bg-[var(--bg-raised)] text-[var(--text-hi)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-500)]/40 focus:border-[var(--gold-500)]/40 transition"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs uppercase tracking-wider text-[var(--text-lo)]">
          {t("login_password_label")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full h-11 px-3 rounded-md border border-[var(--border-strong)] bg-[var(--bg-raised)] text-[var(--text-hi)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-500)]/40 focus:border-[var(--gold-500)]/40 transition"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-[var(--crimson-400)]" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] font-semibold disabled:opacity-60 hover:brightness-110 active:scale-[0.99] transition"
      >
        {pending ? t("login_submitting") : t("login_submit")}
      </button>
    </form>
  );
}
