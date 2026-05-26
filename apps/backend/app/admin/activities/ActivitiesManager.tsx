"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { createActivityAction, type ActivityType } from "./actions";

const DEFAULT_SETTINGS: Record<ActivityType, Record<string, unknown>> = {
  worldcup_prediction: { token_reward: 10 },
  daily_checkin: { day_rewards: [5, 8, 10, 12, 15, 20, 30], reset_on_miss: true, cycle_after_day7: true },
  lucky_draw: {},
  spin_wheel: {},
  deposit_mission: {},
  referral_mission: {},
};

export function ActivitiesManager() {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
    { value: "worldcup_prediction", label: t("activity_type_worldcup") },
    { value: "daily_checkin", label: t("activity_type_checkin") },
    { value: "lucky_draw", label: t("activity_type_lucky") },
    { value: "spin_wheel", label: t("activity_type_spin") },
    { value: "deposit_mission", label: t("activity_type_deposit") },
    { value: "referral_mission", label: t("activity_type_referral") },
  ];

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>("daily_checkin");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(10);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error(t("activity_create_name_required")); return; }
    startTransition(async () => {
      const r = await createActivityAction({
        type,
        name: name.trim(),
        description: description.trim() || undefined,
        is_active: true,
        is_visible: true,
        sort_order: sortOrder,
        settings: DEFAULT_SETTINGS[type] ?? {},
      });
      if (r.error) { toast.error(r.error); return; }
      toast.success(t("activity_create_success"));
      setOpen(false);
      setName("");
      setDescription("");
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 px-4 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium"
      >
        + {t("activities_create")}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">{t("activity_create_type_label")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
          >
            {ACTIVITY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("activity_create_sort_label")}</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t("activity_create_name_label")}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("activity_create_name_hint")}
          className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t("activity_create_desc_label")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium disabled:opacity-60"
        >
          {pending ? t("activity_create_creating") : t("activity_create_btn")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 px-4 rounded-md border border-zinc-300 text-sm"
        >
          {t("activity_create_cancel")}
        </button>
      </div>
    </form>
  );
}
