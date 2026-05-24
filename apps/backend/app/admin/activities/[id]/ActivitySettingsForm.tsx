"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateActivityAction } from "../actions";

interface Props {
  activity: {
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    banner_url: string | null;
    rules: string | null;
    start_at: string | null;
    end_at: string | null;
    is_active: boolean;
    is_visible: boolean;
    sort_order: number;
  };
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

export function ActivitySettingsForm({ activity }: Props) {
  const [name, setName] = useState(activity.name);
  const [slug, setSlug] = useState(activity.slug ?? "");
  const [description, setDescription] = useState(activity.description ?? "");
  const [bannerUrl, setBannerUrl] = useState(activity.banner_url ?? "");
  const [rules, setRules] = useState(activity.rules ?? "");
  const [startAt, setStartAt] = useState(toDatetimeLocal(activity.start_at));
  const [endAt, setEndAt] = useState(toDatetimeLocal(activity.end_at));
  const [isActive, setIsActive] = useState(activity.is_active);
  const [isVisible, setIsVisible] = useState(activity.is_visible);
  const [sortOrder, setSortOrder] = useState(activity.sort_order);
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await updateActivityAction(activity.id, {
        name,
        slug: slug || undefined,
        description,
        banner_url: bannerUrl,
        rules,
        start_at: startAt ? new Date(startAt).toISOString() : undefined,
        end_at: endAt ? new Date(endAt).toISOString() : undefined,
        is_active: isActive,
        is_visible: isVisible,
        sort_order: sortOrder,
      });
      if (r.error) { toast.error(r.error); return; }
      toast.success("活动设置已保存");
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">活动名称 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug（URL 标识）</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="例：daily-checkin"
            className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">活动说明</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <label className="block text-sm font-medium">Banner 图片 URL</label>
          <span className="text-xs text-zinc-400">推荐尺寸：750 × 300 px（比例 5:2，JPG/WebP，&lt;200 KB）</span>
        </div>
        <input
          type="url"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          placeholder="https://..."
          className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">活动规则</label>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          rows={4}
          placeholder="每天仅可签到一次。按 GMT+8 日期判断。"
          className="w-full px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">开始时间 (GMT+8)</label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">结束时间 (GMT+8)</label>
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">排序</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            活动开启
          </label>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            前台显示
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="h-10 px-5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "保存中…" : "保存设置"}
      </button>
    </form>
  );
}
