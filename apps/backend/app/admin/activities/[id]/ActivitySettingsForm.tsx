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
    settings: Record<string, unknown>;
  };
}

type Locale = "zh" | "en" | "ms";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

const LOCALE_TABS: { key: Locale; label: string }[] = [
  { key: "zh", label: "中文" },
  { key: "en", label: "EN" },
  { key: "ms", label: "BM" },
];

export function ActivitySettingsForm({ activity }: Props) {
  const s = activity.settings;

  // zh — top-level columns
  const [name, setName] = useState(activity.name);
  const [description, setDescription] = useState(activity.description ?? "");
  const [bannerUrl, setBannerUrl] = useState(activity.banner_url ?? "");
  const [rules, setRules] = useState(activity.rules ?? "");

  // en — stored in settings
  const [nameEn, setNameEn] = useState((s.name_en as string) ?? "");
  const [descriptionEn, setDescriptionEn] = useState((s.description_en as string) ?? "");
  const [bannerUrlEn, setBannerUrlEn] = useState((s.banner_url_en as string) ?? "");
  const [rulesEn, setRulesEn] = useState((s.rules_en as string) ?? "");

  // ms — stored in settings
  const [nameMs, setNameMs] = useState((s.name_ms as string) ?? "");
  const [descriptionMs, setDescriptionMs] = useState((s.description_ms as string) ?? "");
  const [bannerUrlMs, setBannerUrlMs] = useState((s.banner_url_ms as string) ?? "");
  const [rulesMs, setRulesMs] = useState((s.rules_ms as string) ?? "");

  // common fields
  const [slug, setSlug] = useState(activity.slug ?? "");
  const [startAt, setStartAt] = useState(toDatetimeLocal(activity.start_at));
  const [endAt, setEndAt] = useState(toDatetimeLocal(activity.end_at));
  const [isActive, setIsActive] = useState(activity.is_active);
  const [isVisible, setIsVisible] = useState(activity.is_visible);
  const [sortOrder, setSortOrder] = useState(activity.sort_order);

  const [activeLocale, setActiveLocale] = useState<Locale>("zh");
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      // Merge localized fields back into settings, preserving other keys (e.g. day_rewards)
      const mergedSettings: Record<string, unknown> = {
        ...activity.settings,
        name_en: nameEn || null,
        description_en: descriptionEn || null,
        banner_url_en: bannerUrlEn || null,
        rules_en: rulesEn || null,
        name_ms: nameMs || null,
        description_ms: descriptionMs || null,
        banner_url_ms: bannerUrlMs || null,
        rules_ms: rulesMs || null,
      };

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
        settings: mergedSettings,
      });
      if (r.error) { toast.error(r.error); return; }
      toast.success("活动设置已保存");
    });
  }

  const inputCls = "w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm";
  const textareaCls = "w-full px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm";

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* Locale tabs */}
      <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg w-fit">
        {LOCALE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveLocale(tab.key)}
            className={
              "px-4 py-1.5 rounded-md text-sm font-medium transition " +
              (activeLocale === tab.key
                ? "bg-white shadow text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ZH fields */}
      {activeLocale === "zh" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">活动名称 *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">活动说明</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={textareaCls} />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="block text-sm font-medium">Banner 图片 URL</label>
              <span className="text-xs text-zinc-400">推荐：750 × 300 px（5:2，JPG/WebP，&lt;200 KB）</span>
            </div>
            <input type="url" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">活动规则</label>
            <textarea value={rules} onChange={(e) => setRules(e.target.value)} rows={4} className={textareaCls} />
          </div>
        </div>
      )}

      {/* EN fields */}
      {activeLocale === "en" && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">留空则前端自动显示中文版内容。</p>
          <div>
            <label className="block text-sm font-medium mb-1">Activity Name (EN)</label>
            <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Daily Check-in Event" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (EN)</label>
            <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={2} placeholder="e.g. Check in daily to earn Tokens!" className={textareaCls} />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="block text-sm font-medium">Banner URL (EN)</label>
              <span className="text-xs text-zinc-400">750 × 300 px</span>
            </div>
            <input type="url" value={bannerUrlEn} onChange={(e) => setBannerUrlEn(e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rules (EN)</label>
            <textarea value={rulesEn} onChange={(e) => setRulesEn(e.target.value)} rows={4} placeholder="1. Check in once per day (GMT+8)..." className={textareaCls} />
          </div>
        </div>
      )}

      {/* MS / BM fields */}
      {activeLocale === "ms" && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">Kosongkan untuk gunakan kandungan versi Cina secara automatik.</p>
          <div>
            <label className="block text-sm font-medium mb-1">Nama Aktiviti (BM)</label>
            <input type="text" value={nameMs} onChange={(e) => setNameMs(e.target.value)} placeholder="cth. Acara Check In Harian" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Penerangan (BM)</label>
            <textarea value={descriptionMs} onChange={(e) => setDescriptionMs(e.target.value)} rows={2} placeholder="cth. Daftar masuk setiap hari untuk menang Token!" className={textareaCls} />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="block text-sm font-medium">Banner URL (BM)</label>
              <span className="text-xs text-zinc-400">750 × 300 px</span>
            </div>
            <input type="url" value={bannerUrlMs} onChange={(e) => setBannerUrlMs(e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Peraturan (BM)</label>
            <textarea value={rulesMs} onChange={(e) => setRulesMs(e.target.value)} rows={4} placeholder="1. Daftar masuk sekali sehari (GMT+8)..." className={textareaCls} />
          </div>
        </div>
      )}

      {/* Common fields (always shown) */}
      <div className="border-t border-zinc-100 pt-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Slug（URL 标识）</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="例：daily-checkin" className={`${inputCls} font-mono`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">开始时间 (GMT+8)</label>
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">结束时间 (GMT+8)</label>
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">排序</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className={inputCls} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded" />
              活动开启
            </label>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} className="h-4 w-4 rounded" />
              前台显示
            </label>
          </div>
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
