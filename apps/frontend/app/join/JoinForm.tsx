"use client";

import { useActionState, useState } from "react";
import { submitJoinRequestAction, type JoinState } from "./actions";
import { JoinWaiting } from "./JoinWaiting";
import { tFe, type FeLocale } from "@/lib/i18n";

interface Props {
  refUsername: string;
  locale: FeLocale;
  langUrls: { ms: string; en: string; zh: string };
}

export function JoinForm({ refUsername, locale, langUrls: _langUrls }: Props) {
  const t = (k: Parameters<typeof tFe>[1]) => tFe(locale, k);
  const [state, action, pending] = useActionState<JoinState, FormData>(
    submitJoinRequestAction,
    undefined,
  );

  // Controlled fields for client-side validation
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  if (state && "ok" in state) {
    return (
      <JoinWaiting
        threadId={state.threadId}
        guestToken={state.guestToken}
        guestName={state.guestName}
        credentials={state.credentials}
        locale={locale}
      />
    );
  }

  // Name: only allow letters and spaces
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Strip anything that isn't a letter or space
    const filtered = raw.replace(/[^a-zA-Z\s]/g, "");
    setName(filtered);
    if (filtered !== raw) {
      setNameError(
        locale === "zh" ? "姓名只能输入字母，不允许数字或符号"
        : locale === "en" ? "Name must contain letters only"
        : "Nama hanya boleh mengandungi huruf"
      );
    } else {
      setNameError("");
    }
  }

  // Phone: only digits allowed, must start with 0
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Only allow digits and +
    const filtered = raw.replace(/[^0-9+\-\s]/g, "");
    setPhone(filtered);

    if (filtered.length > 0 && !filtered.startsWith("0")) {
      setPhoneError(
        locale === "zh" ? "手机号码首个数字必须是 0"
        : locale === "en" ? "Phone number must start with 0"
        : "Nombor telefon mesti bermula dengan 0"
      );
    } else {
      setPhoneError("");
    }
  }

  const hasClientError = !!(nameError || phoneError);

  return (
    <form action={action} className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] p-6 space-y-4">
      <h2 className="text-lg font-bold text-[var(--text-hi)]">{t("join_form_title")}</h2>

      {/* Referrer tag */}
      <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-subtle)] px-3 py-2 text-sm">
        <span>🔗</span>
        <span className="text-[var(--text-lo)]">{t("join_invited_by")}</span>
        <span className="font-semibold text-[var(--gold-300)]">{refUsername}</span>
        <span className="text-[var(--text-lo)] text-xs ml-auto">{t("join_auto_recorded")}</span>
      </div>
      <input type="hidden" name="ref_username" value={refUsername} />
      <input type="hidden" name="locale" value={locale} />

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--text-mid)]">{t("join_field_name")}</label>
        <input
          name="name"
          required
          value={name}
          onChange={handleNameChange}
          placeholder={t("join_field_name_placeholder")}
          className={`w-full h-11 px-3 rounded-xl bg-[var(--bg-base)] border text-[var(--text-hi)] placeholder:text-[var(--text-lo)] text-sm outline-none focus:border-[var(--gold-500)] transition ${
            nameError ? "border-red-500" : "border-[var(--border-subtle)]"
          }`}
        />
        {nameError && (
          <p className="text-xs text-red-400">{nameError}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--text-mid)]">{t("join_field_phone")}</label>
        <input
          name="phone"
          type="tel"
          required
          value={phone}
          onChange={handlePhoneChange}
          placeholder={t("join_field_phone_placeholder")}
          className={`w-full h-11 px-3 rounded-xl bg-[var(--bg-base)] border text-[var(--text-hi)] placeholder:text-[var(--text-lo)] text-sm outline-none focus:border-[var(--gold-500)] transition ${
            phoneError ? "border-red-500" : "border-[var(--border-subtle)]"
          }`}
        />
        {phoneError ? (
          <p className="text-xs text-red-400">{phoneError}</p>
        ) : (
          <p className="text-xs text-amber-400">{t("join_field_phone_hint")}</p>
        )}
      </div>

      {/* Server-side error */}
      {state && "error" in state && (
        <p className="text-sm text-[var(--crimson-400)]">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || hasClientError}
        className="w-full h-12 rounded-xl bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] font-bold text-sm disabled:opacity-60 transition hover:brightness-110"
      >
        {pending ? t("join_submitting") : t("join_submit")}
      </button>

      <p className="text-center text-xs text-[var(--gold-400)] leading-relaxed">{t("join_footer")}</p>
    </form>
  );
}
