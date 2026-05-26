"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { createRoleAction } from "./actions";

const ALL_MODULES_ORDERED = [
  "overview", "players", "recharge", "activities", "rewards",
  "redemptions", "checkins", "chat", "quick_replies", "staff", "roles",
];

export function CreateRoleForm({ modules, onCreated }: { modules: Record<string, string>; onCreated?: () => void }) {
  const { locale } = useLang();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_MODULES_ORDERED.map(m => [m, false]))
  );
  const [pending, startTransition] = useTransition();

  function handleNameChange(v: string) {
    setName(v);
  }

  function toggle(module: string) {
    setPermissions(p => ({ ...p, [module]: !p[module] }));
  }

  function toggleAll(value: boolean) {
    setPermissions(Object.fromEntries(ALL_MODULES_ORDERED.map(m => [m, value])));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createRoleAction(name, slug, permissions);
      if ("error" in r) { toast.error(r.error); return; }
      toast.success(tBo(locale, "role_create_success"));
      setName("");
      setSlug("");
      setPermissions(Object.fromEntries(ALL_MODULES_ORDERED.map(m => [m, false])));
      onCreated?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{tBo(locale, "role_create_name")} <span className="text-red-500">*</span></span>
          <input
            type="text"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder={tBo(locale, "role_create_name_hint")}
            required
            className="h-10 px-3 rounded-md border border-zinc-300 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{tBo(locale, "role_create_slug")} <span className="text-zinc-400 font-normal"></span></span>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder={tBo(locale, "role_create_slug_hint")}
            required
            pattern="[a-z0-9_]+"
            className="h-10 px-3 rounded-md border border-zinc-300 bg-transparent text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </label>
      </div>

      {/* Permission matrix */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{tBo(locale, "role_create_modules")}</span>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => toggleAll(true)} className="text-zinc-500 hover:text-zinc-800 underline">{tBo(locale, "role_create_select_all")}</button>
            <button type="button" onClick={() => toggleAll(false)} className="text-zinc-500 hover:text-zinc-800 underline">{tBo(locale, "role_create_clear")}</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_MODULES_ORDERED.map(m => (
            <label key={m} className="flex items-center gap-2 cursor-pointer select-none text-sm py-1.5 px-3 rounded-md border border-zinc-200 hover:border-zinc-300 transition">
              <input
                type="checkbox"
                checked={permissions[m] ?? false}
                onChange={() => toggle(m)}
                className="h-4 w-4 rounded"
              />
              <span>{modules[m] ?? m}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="h-10 px-6 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium disabled:opacity-60"
      >
        {pending ? tBo(locale, "role_create_creating") : tBo(locale, "role_create_btn")}
      </button>
    </form>
  );
}
