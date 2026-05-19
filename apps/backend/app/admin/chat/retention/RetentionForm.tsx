"use client";

import { useState } from "react";
import { updateRetentionSettingsAction } from "./actions";

interface Props {
  defaults: {
    message_retention_days: number;
    media_retention_days: number;
    archive_closed_threads_after_days: number;
  };
}

export function RetentionForm({ defaults }: Props) {
  const [messageDays, setMessageDays] = useState(String(defaults.message_retention_days));
  const [mediaDays, setMediaDays] = useState(String(defaults.media_retention_days));
  const [archiveDays, setArchiveDays] = useState(String(defaults.archive_closed_threads_after_days));
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
      });
      setResult(res);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          消息保留天数
          <span className="ml-1 font-normal text-zinc-400 text-xs">(文字消息)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={3650}
            value={messageDays}
            onChange={(e) => setMessageDays(e.target.value)}
            className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            required
          />
          <span className="text-sm text-zinc-500">天</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          媒体保留天数
          <span className="ml-1 font-normal text-zinc-400 text-xs">(图片/文件)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={3650}
            value={mediaDays}
            onChange={(e) => setMediaDays(e.target.value)}
            className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            required
          />
          <span className="text-sm text-zinc-500">天</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          已关闭会话归档天数
          <span className="ml-1 font-normal text-zinc-400 text-xs">(关闭后多少天自动归档)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={365}
            value={archiveDays}
            onChange={(e) => setArchiveDays(e.target.value)}
            className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            required
          />
          <span className="text-sm text-zinc-500">天</span>
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
