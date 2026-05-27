"use client";

import { useActionState, useEffect } from "react";
import { submitJoinRequestAction, type JoinState } from "./actions";
import { tFe, type FeLocale } from "@/lib/i18n";

interface Props {
  refUsername: string;
  locale: FeLocale;
}

export function JoinForm({ refUsername, locale }: Props) {
  const t = (k: Parameters<typeof tFe>[1]) => tFe(locale, k);
  const [state, action, pending] = useActionState<JoinState, FormData>(
    submitJoinRequestAction,
    undefined,
  );

  if (state && "ok" in state) {
    return (
      <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] p-8 text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-bold text-[var(--text-hi)]">{t("join_success_title")}</h2>
        <p className="text-sm text-[var(--text-mid)] leading-relaxed">{t("join_success_body")}</p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] p-6 space-y-4">
      <h2 className="text-lg font-bold text-[var(--text-hi)]">{t("join_form_title")}</h2>
      <p className="text-sm text-[var(--text-mid)]">{t("join_form_sub")}</p>

      {/* Referrer tag */}
      <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-subtle)] px-3 py-2 text-sm">
        <span>🔗</span>
        <span className="text-[var(--text-lo)]">{t("join_invited_by")}</span>
        <span className="font-semibold text-[var(--gold-300)]">{refUsername}</span>
        <span className="text-[var(--text-lo)] text-xs ml-auto">{t("join_auto_recorded")}</span>
      </div>
      <input type="hidden" name="ref_username" value={refUsername} />

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--text-mid)]">{t("join_field_name")}</label>
        <input
          name="name"
          required
          placeholder={t("join_field_name_placeholder")}
          className="w-full h-11 px-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-hi)] placeholder:text-[var(--text-lo)] text-sm outline-none focus:border-[var(--gold-500)] transition"
        />
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--text-mid)]">{t("join_field_phone")}</label>
        <input
          name="phone"
          type="tel"
          required
          placeholder={t("join_field_phone_placeholder")}
          className="w-full h-11 px-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-hi)] placeholder:text-[var(--text-lo)] text-sm outline-none focus:border-[var(--gold-500)] transition"
        />
        <p className="text-xs text-[var(--text-lo)]">{t("join_field_phone_hint")}</p>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-[var(--crimson-400)]">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-12 rounded-xl bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] font-bold text-sm disabled:opacity-60 transition hover:brightness-110"
      >
        {pending ? t("join_submitting") : t("join_submit")}
      </button>

      <p className="text-center text-xs text-[var(--text-lo)]">{t("join_footer")}</p>
    </form>
  );
}
