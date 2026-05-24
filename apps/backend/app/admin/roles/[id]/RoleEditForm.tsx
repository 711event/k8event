"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
      toast.success("角色已保存");
    });
  }

  function handleDelete() {
    if (!confirm(`确认删除角色「${name}」？此操作不可撤销。`)) return;
    startDeleting(async () => {
      const r = await deleteRoleAction(id);
      if ("error" in r) { toast.error(r.error); return; }
      toast.success("角色已删除");
      router.push("/admin/roles");
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Role name */}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">角色名称 <span className="text-red-500">*</span></span>
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
          <span className="text-sm font-medium">可访问模块</span>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => toggleAll(true)} className="text-zinc-500 hover:text-zinc-800 underline">全选</button>
            <button type="button" onClick={() => toggleAll(false)} className="text-zinc-500 hover:text-zinc-800 underline">清空</button>
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
          {pending ? "保存中…" : "保存设置"}
        </button>

        {!isSystem && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="h-10 px-4 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium disabled:opacity-60 transition"
          >
            {deleting ? "删除中…" : "删除此角色"}
          </button>
        )}
        {isSystem && (
          <p className="text-xs text-zinc-400">系统内置角色不可删除</p>
        )}
      </div>
    </form>
  );
}
