"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createActivityAction, type ActivityType } from "./actions";

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "worldcup_prediction", label: "世界杯竞猜" },
  { value: "daily_checkin", label: "每日签到" },
  { value: "lucky_draw", label: "幸运抽奖" },
  { value: "spin_wheel", label: "转盘" },
  { value: "deposit_mission", label: "充值任务" },
  { value: "referral_mission", label: "推荐任务" },
];

const DEFAULT_SETTINGS: Record<ActivityType, Record<string, unknown>> = {
  worldcup_prediction: { token_reward: 10 },
  daily_checkin: { day_rewards: [5, 8, 10, 12, 15, 20, 30], reset_on_miss: true, cycle_after_day7: true },
  lucky_draw: {},
  spin_wheel: {},
  deposit_mission: {},
  referral_mission: {},
};

export function ActivitiesManager() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>("daily_checkin");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(10);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("请填写活动名称"); return; }
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
      toast.success("活动已创建");
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
        + 新建活动
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">活动类型</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">排序</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">活动名称 *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：每日签到奖励"
          className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
        />
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
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium disabled:opacity-60"
        >
          {pending ? "创建中…" : "创建活动"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 px-4 rounded-md border border-zinc-300 text-sm"
        >
          取消
        </button>
      </div>
    </form>
  );
}
