"use client";

import { useState } from "react";
import { updateRetentionSettingsAction } from "./actions";

interface Props {
  defaults: {
    message_retention_days: number;
    media_retention_days: number;
    archive_closed_threads_after_days: number;
    warn_after_minutes: number;
    critical_after_minutes: number;
  };
}

function NumberInput({
  label,
  hint,
  value,
  onChange,
  unit,
  min,
  max,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">
        {label}
        {hint && (
          <span className="ml-1 font-normal text-zinc-400 text-xs">({hint})</span>
        )}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min ?? 1}
          max={max ?? 9999}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          required
        />
        <span className="text-sm text-zinc-500">{unit}</span>
      </div>
    </div>
  );
}

export function RetentionForm({ defaults }: Props) {
  const [messageDays, setMessageDays] = useState(String(defaults.message_retention_days));
  const [mediaDays, setMediaDays] = useState(String(defaults.media_retention_days));
  const [archiveDays, setArchiveDays] = useState(String(defaults.archive_closed_threads_after_days));
  const [warnMin, setWarnMin] = useState(String(defaults.warn_after_minutes));
  const [criticalMin, setCriticalMin] = useState(String(defaults.critical_after_minutes));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const res = await updateRetentionSettingsAction({
        message_retention_days: Number(messageDays),
        media_retention_days: Number(mediaDays),
        archive_closed_threads_after_days: Number(archiveDays),
        warn_after_minutes: Number(warnMin),
        critical_after_minutes: Number(criticalMin),
      });
      setResult(res);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: Data retention */}
      <div className="space-y-5">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          数据保留
        </h2>
        <NumberInput
          label="消息保留天数"
          hint="文字消息"
          value={messageDays}
          onChange={setMessageDays}
          unit="天"
          min={1}
          max={3650}
        />
        <NumberInput
          label="媒体保留天数"
          hint="图片/文件"
          value={mediaDays}
          onChange={setMediaDays}
          unit="天"
          min={1}
          max={3650}
        />
        <NumberInput
          label="已关闭会话归档天数"
          hint="关闭后多少天自动归档"
          value={archiveDays}
          onChange={setArchiveDays}
          unit="天"
          min={1}
          max={365}
        />
      </div>

      <hr className="border-zinc-200" />

      {/* Section 2: Inbox urgency colours */}
      <div className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            收件箱颜色预警
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            会员最后一条消息发出后，超过以下时间仍未回复时，该会话行变色提醒。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-sm bg-red-50 border border-red-200 shrink-0" />
          <NumberInput
            label="浅红色预警"
            hint="超过此时间显示浅红"
            value={warnMin}
            onChange={setWarnMin}
            unit="分钟"
            min={1}
            max={120}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-sm bg-red-100 border border-red-300 shrink-0" />
          <NumberInput
            label="深红色预警"
            hint="超过此时间显示深红"
            value={criticalMin}
            onChange={setCriticalMin}
            unit="分钟"
            min={1}
            max={120}
          />
        </div>
      </div>

      {result?.ok && (
        <p className="text-sm text-emerald-600">✓ 已保存</p>
      )}
      {result?.error && (
        <p className="text-sm text-red-600">错误: {result.error}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition"
      >
        {saving ? "保存中…" : "保存设置"}
      </button>
    </form>
  );
}
