"use client";

import { useState } from "react";
import { saveReferralSettingsAction } from "./actions";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";

interface Props {
  initial: {
    enabled: boolean;
    trigger_type: "on_register" | "on_first_recharge" | "on_min_recharge";
    min_recharge_amount: number;
    referrer_token_reward: number;
    share_mode: "link_only" | "link_and_card";
    share_message_zh: string | null;
    share_message_en: string | null;
    share_message_ms: string | null;
    og_image_url: string | null;
  };
}

export function ReferralSettingsForm({ initial }: Props) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], v?: Parameters<typeof tBo>[2]) => tBo(locale, k, v);

  const [enabled, setEnabled] = useState(initial.enabled);
  const [trigger, setTrigger] = useState(initial.trigger_type);
  const [minRecharge, setMinRecharge] = useState(initial.min_recharge_amount);
  const [reward, setReward] = useState(initial.referrer_token_reward);
  const [shareMode, setShareMode] = useState(initial.share_mode);
  const [shareMsgZh, setShareMsgZh] = useState(initial.share_message_zh ?? "");
  const [shareMsgEn, setShareMsgEn] = useState(initial.share_message_en ?? "");
  const [shareMsgMs, setShareMsgMs] = useState(initial.share_message_ms ?? "");
  const [ogImageUrl, setOgImageUrl] = useState(initial.og_image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await saveReferralSettingsAction({
      enabled,
      trigger_type: trigger,
      min_recharge_amount: minRecharge,
      referrer_token_reward: reward,
      share_mode: shareMode,
      share_message_zh: shareMsgZh.trim() || null,
      share_message_en: shareMsgEn.trim() || null,
      share_message_ms: shareMsgMs.trim() || null,
      og_image_url: ogImageUrl.trim() || null,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-800">{t("referral_settings_enabled_label")}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t("referral_settings_enabled_hint")}</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-emerald-500" : "bg-zinc-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Reward trigger */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700">{t("referral_settings_trigger_label")}</label>
        <select
          value={trigger}
          onChange={(e) => setTrigger(e.target.value as typeof trigger)}
          className="w-full h-9 px-3 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="on_register">{t("referral_trigger_on_register")}</option>
          <option value="on_first_recharge">{t("referral_trigger_on_first_recharge")}</option>
          <option value="on_min_recharge">{t("referral_trigger_on_min_recharge")}</option>
        </select>
        <p className="text-xs text-zinc-500">{t("referral_settings_trigger_hint")}</p>
      </div>

      {/* Min recharge (shown only for on_min_recharge) */}
      {trigger === "on_min_recharge" && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">{t("referral_settings_min_recharge_label")}</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">RM</span>
            <input
              type="number"
              min={0}
              value={minRecharge}
              onChange={(e) => setMinRecharge(Number(e.target.value))}
              className="w-32 h-9 px-3 rounded-lg border border-zinc-300 text-sm outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <p className="text-xs text-zinc-500">{t("referral_settings_min_recharge_hint")}</p>
        </div>
      )}

      {/* Referrer reward */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700">{t("referral_settings_reward_label")}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={reward}
            onChange={(e) => setReward(Number(e.target.value))}
            className="w-32 h-9 px-3 rounded-lg border border-zinc-300 text-sm outline-none focus:ring-2 focus:ring-amber-400"
          />
          <span className="text-sm text-zinc-500">Token</span>
        </div>
        <p className="text-xs text-zinc-500">{t("referral_settings_reward_hint")}</p>
      </div>

      {/* Share mode */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700">{t("referral_settings_share_mode_label")}</label>
        <div className="flex flex-col gap-2">
          {(["link_only", "link_and_card"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="share_mode"
                value={m}
                checked={shareMode === m}
                onChange={() => setShareMode(m)}
                className="accent-amber-500"
              />
              <span className="text-sm text-zinc-700">
                {m === "link_only" ? t("referral_share_link_only") : t("referral_share_link_and_card")}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-zinc-500">{t("referral_settings_share_mode_hint")}</p>
      </div>

      {/* OG Image URL — only when link_and_card */}
      {shareMode === "link_and_card" && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">{t("referral_settings_og_image_label")}</label>
          <input
            type="url"
            value={ogImageUrl}
            onChange={(e) => setOgImageUrl(e.target.value)}
            placeholder="https://i.imgur.com/xxx.jpg"
            className="w-full h-9 px-3 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-amber-400"
          />
          {ogImageUrl && (
            <img src={ogImageUrl} alt="OG preview" className="mt-2 rounded-lg border border-zinc-200 max-h-32 object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
          <p className="text-xs text-zinc-500 leading-relaxed">{t("referral_settings_og_image_hint")}</p>
        </div>
      )}

      {/* Share message — 3 languages */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-zinc-700">{t("referral_settings_share_msg_label")}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t("referral_settings_share_msg_hint")}</p>
        </div>
        {(
          [
            { lang: "中文", value: shareMsgZh, setter: setShareMsgZh, placeholder: t("referral_settings_share_msg_placeholder_zh") },
            { lang: "EN",   value: shareMsgEn, setter: setShareMsgEn, placeholder: t("referral_settings_share_msg_placeholder_en") },
            { lang: "BM",   value: shareMsgMs, setter: setShareMsgMs, placeholder: t("referral_settings_share_msg_placeholder_ms") },
          ] as const
        ).map(({ lang, value, setter, placeholder }) => (
          <div key={lang} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{lang}</span>
              <span className={`text-xs ${value.length > 450 ? "text-red-500" : "text-zinc-400"}`}>{value.length}/500</span>
            </div>
            <textarea
              value={value}
              onChange={(e) => setter(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={placeholder}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>
        ))}
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="h-9 px-5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60 transition"
      >
        {saving ? t("referral_settings_saving") : saved ? `✓ ${t("referral_settings_saved")}` : t("referral_settings_save")}
      </button>
    </div>
  );
}
