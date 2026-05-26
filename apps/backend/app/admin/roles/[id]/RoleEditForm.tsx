"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import { updateRoleAction, deleteRoleAction } from "../actions";

const ALL_MODULES_ORDERED = [
  "overview", "players", "recharge", "activities", "rewards",
  "redemptions", "checkins", "chat", "quick_replies", "staff", "roles",
];

interface Props {
  id: string;
  initialName: string;
  initialPermissions: Record<string, boolean>;
  isSystem: boolean;
  modules: Record<string, string>;
}

export function RoleEditForm({ id, initialName, initialPermissions, isSystem, modules }: Props) {
  const { locale } = useLang();
  const [name, setName] = useState(initialName);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_MODULES_ORDERED.map(m => [m, initialPermissions[m] ?? false]))
  );
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const router = useRouter();

  function toggle(module: string) {
    setPermissions(p => ({ ...p, [module]: !p[module] }));
  }

  function toggleAll(value: boolean) {
    setPermissions(Object.fromEntries(ALL_MODULES_ORDERED.map(m => [m, value])));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await updateRoleAction(id, name, permissions);
      if ("error" in r) { toast.error(r.error); return; }
      toast.success(tBo(locale, "role_edit_saved"));
    });
  }

  function handleDelete() {
    if (!confirm(tBo(locale, "role_edit_delete_confirm", { name }))) return;
    startDeleting(async () => {
      const r = await deleteRoleAction(id);
      if ("error" in r) { toast.error(r.error); return; }
      toast.success(tBo(locale, "role_edit_deleted"));
      router.push("/admin/roles");
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Role name */}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{tBo(locale, "role_edit_name")} <span className="text-red-500">*</span></span>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="h-10 px-3 rounded-md border border-zinc-300 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 max-w-xs"
        />
      </label>

      {/* Permission matrix */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{tBo(locale, "role_edit_modules")}</span>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => toggleAll(true)} className="text-zinc-500 hover:text-zinc-800 underline">{tBo(locale, "role_edit_select_all")}</button>
            <button type="button" onClick={() => toggleAll(false)} className="text-zinc-500 hover:text-zinc-800 underline">{tBo(locale, "role_edit_clear")}</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_MODULES_ORDERED.map(m => (
            <label
              key={m}
              className={
                "flex items-center gap-2 cursor-pointer select-none text-sm py-1.5 px-3 rounded-md border transition " +
                (permissions[m]
                  ? "bg-zinc-900 border-zinc-900 text-white"
                  : "border-zinc-200 hover:border-zinc-300 text-zinc-600")
              }
            >
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

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-6 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium disabled:opacity-60"
        >
          {pending ? tBo(locale, "role_edit_saving") : tBo(locale, "role_edit_save")}
        </button>

        {!isSystem && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="h-10 px-4 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium disabled:opacity-60 transition"
          >
            {deleting ? tBo(locale, "role_edit_deleting") : tBo(locale, "role_edit_delete")}
          </button>
        )}
        {isSystem && (
          <p className="text-xs text-zinc-400">{tBo(locale, "role_edit_system_note")}</p>
        )}
      </div>
    </form>
  );
}
