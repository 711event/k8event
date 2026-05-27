"use client";

import { useState } from "react";
import { tFe, type FeLocale } from "@/lib/i18n";

interface Props {
  referralUrl: string;
  username: string;
  companyName: string;
  showCard: boolean;
  shareMessage: string | null;
  locale: FeLocale;
}

export function ReferralClient({ referralUrl, username, companyName, showCard, shareMessage, locale }: Props) {
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(referralUrl).catch(() => {
      const el = document.createElement("textarea");
      el.value = referralUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Use admin-configured message if set, otherwise fall back to i18n default
  function buildShareText() {
    const msg = shareMessage?.trim() || t("referral_share_msg", { company: companyName });
    return `${msg}\n${referralUrl}`;
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`, "_blank");
  }

  function shareTelegram() {
    const text = buildShareText();
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`, "_blank");
  }

  function shareOther() {
    if (navigator.share) {
      navigator.share({ title: companyName, text: buildShareText(), url: referralUrl }).catch(() => {});
    } else {
      copyLink();
    }
  }

  return (
    <div className="space-y-3">
      {/* Link box */}
      <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--text-lo)] uppercase tracking-wider">{t("referral_link_label")}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] px-3 py-2.5 text-xs text-[var(--text-mid)] font-mono truncate">
            {referralUrl}
          </div>
          <button
            onClick={copyLink}
            className="h-10 px-4 rounded-xl bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-xs font-bold transition hover:brightness-110 shrink-0"
          >
            {copied ? `✓ ${t("referral_copied")}` : t("referral_copy")}
          </button>
        </div>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={shareWhatsApp}
          className="h-11 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-mid)] hover:border-[#25D366] hover:text-[#25D366] transition flex items-center justify-center gap-1.5"
        >
          📲 WhatsApp
        </button>
        <button
          onClick={shareTelegram}
          className="h-11 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-mid)] hover:border-[#229ED9] hover:text-[#229ED9] transition flex items-center justify-center gap-1.5"
        >
          ✈️ Telegram
        </button>
        <button
          onClick={shareOther}
          className="h-11 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-mid)] hover:border-[var(--gold-500)] hover:text-[var(--gold-300)] transition flex items-center justify-center gap-1.5"
        >
          ⋯ {t("referral_more")}
        </button>
      </div>

      {/* Share card */}
      {showCard && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-lo)] px-1">{t("referral_card_hint")}</p>
          <div className="rounded-2xl overflow-hidden border border-[var(--border-strong)]">
            <div className="bg-gradient-to-br from-[#1a1f2e] to-[#0d1117] p-6 text-center space-y-3">
              <div className="text-3xl">🎁</div>
              <div className="font-bold text-xl text-[var(--gold-300)]">{companyName}</div>
              <div className="inline-flex items-center gap-2 bg-[var(--gold-500)]/20 border border-[var(--gold-500)]/30 rounded-full px-4 py-1.5 text-sm font-semibold text-[var(--gold-300)]">
                🎁 {t("referral_card_invite")}
              </div>
              <p className="text-sm text-[var(--text-mid)] leading-relaxed">
                {t("referral_card_body")}
              </p>
              <div className="mx-auto w-fit bg-[var(--bg-base)] border border-dashed border-[var(--gold-500)]/40 rounded-xl px-6 py-2.5">
                <span className="font-bold text-base text-[var(--gold-300)] tracking-widest uppercase">
                  REF · {username}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-lo)] font-mono">{referralUrl}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
