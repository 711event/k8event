"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Plus, Trash2, KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import { CreateRoleForm } from "../roles/CreateRoleForm";
import { updateRoleAction, deleteRoleAction } from "../roles/actions";
import {
  createStaffAction,
  assignRoleAction,
  changeStaffPasswordAction,
  deleteStaffAction,
} from "./actions";

const MODULE_LABELS: Record<string, string> = {
  overview: "总览",
  players: "玩家管理",
  recharge: "充值导入",
  activities: "活动管理",
  rewards: "奖品",
  redemptions: "兑换审核",
  checkins: "签到记录",
  chat: "客服会话",
  quick_replies: "快速回复",
  staff: "后台账号",
  roles: "角色权限",
};
const ALL_MODULES = Object.keys(MODULE_LABELS);

type StaffRow = {
  user_id: string;
  username: string | null;
  display_name: string;
  role: "admin" | "agent";
  created_at: string;
  admin_role_id: string | null;
  admin_roles: { name: string } | null;
};

type RoleRow = {
  id: string;
  name: string;
  slug: string;
  permissions: Record<string, boolean>;
  is_system: boolean;
  sort_order: number;
};

export function StaffPageClient({
  staffList,
  roles,
  canSeeStaff,
  canSeeRoles,
  defaultTab,
}: {
  staffList: StaffRow[];
  roles: RoleRow[];
  canSeeStaff: boolean;
  canSeeRoles: boolean;
  defaultTab: "accounts" | "roles";
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"accounts" | "roles">(defaultTab);

  function switchTab(tab: "accounts" | "roles") {
    setActiveTab(tab);
    router.push(`/admin/staff?tab=${tab}`, { scroll: false });
  }

  const showTabs = canSeeStaff && canSeeRoles;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">账号管理</h1>
        <p className="text-sm text-zinc-500 mt-1">管理后台账号及角色权限</p>
      </div>

      {showTabs && (
        <div className="border-b border-zinc-200 flex">
          <button
            onClick={() => switchTab("accounts")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "accounts"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            后台账号
          </button>
          <button
            onClick={() => switchTab("roles")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "roles"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            角色权限
          </button>
        </div>
      )}

      {activeTab === "accounts" && canSeeStaff && (
        <AccountsTab staffList={staffList} roles={roles} />
      )}
      {activeTab === "roles" && canSeeRoles && (
        <RolesTab roles={roles} />
      )}
    </div>
  );
}

// ─── Tab 1: Accounts ────────────────────────────────────────────────────────

function AccountsTab({ staffList, roles }: { staffList: StaffRow[]; roles: RoleRow[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [changePwUserId, setChangePwUserId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{staffList.length} 条记录</p>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition"
        >
          <Plus size={15} />
          新建账号
        </button>
      </div>

      <div className="rounded-lg border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">用户名</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 font-medium">创建时间</th>
              <th className="px-4 py-3 font-medium w-24">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-zinc-400 text-center">
                  暂无后台账号
                </td>
              </tr>
            ) : (
              staffList.map(row => (
                <StaffRowItem
                  key={row.user_id}
                  row={row}
                  roles={roles}
                  onChangePw={() => setChangePwUserId(row.user_id)}
                  onRefresh={() => router.refresh()}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateStaffForm
          roles={roles}
          onCreated={() => { setShowCreate(false); router.refresh(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {changePwUserId && (
        <ChangePwModal
          userId={changePwUserId}
          onClose={() => setChangePwUserId(null)}
        />
      )}
    </div>
  );
}

function StaffRowItem({
  row, roles, onChangePw, onRefresh,
}: {
  row: StaffRow;
  roles: RoleRow[];
  onChangePw: () => void;
  onRefresh: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [editRole, setEditRole] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(row.admin_role_id ?? "");

  const systemBadge = row.role === "admin"
    ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">超级管理员</span>
    : <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">代理</span>;

  const customRoleName = row.admin_roles?.name ?? null;

  const createdAt = new Date(row.created_at).toLocaleDateString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });

  function handleDelete() {
    if (!confirm(`确认删除账号 "${row.username ?? row.display_name}"？`)) return;
    startTransition(async () => {
      const r = await deleteStaffAction(row.user_id);
      if (r?.error) { toast.error(r.error); return; }
      toast.success("已删除");
      onRefresh();
    });
  }

  function handleAssignRole() {
    startTransition(async () => {
      const r = await assignRoleAction(row.user_id, selectedRoleId || null);
      if (r?.error) { toast.error(r.error); return; }
      toast.success("角色已更新");
      setEditRole(false);
      onRefresh();
    });
  }

  return (
    <>
      <tr className="hover:bg-zinc-50 transition-colors">
        <td className="px-4 py-3 font-medium">{row.username ?? row.display_name}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            {systemBadge}
            {customRoleName && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                {customRoleName}
              </span>
            )}
            <button
              onClick={() => setEditRole(v => !v)}
              className="text-[11px] text-zinc-400 hover:text-zinc-700 underline"
            >
              {editRole ? "取消" : "改角色"}
            </button>
          </div>
        </td>
        <td className="px-4 py-3 text-zinc-500 text-xs">{createdAt}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={onChangePw}
              title="修改密码"
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition"
            >
              <KeyRound size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={pending}
              title="删除"
              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {editRole && (
        <tr className="bg-zinc-50 border-t border-zinc-100">
          <td colSpan={4} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <select
                value={selectedRoleId}
                onChange={e => setSelectedRoleId(e.target.value)}
                className="h-9 px-3 rounded border border-zinc-300 text-sm bg-white"
              >
                <option value="">无自定义角色</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                onClick={handleAssignRole}
                disabled={pending}
                className="h-9 px-4 rounded bg-zinc-900 text-white text-sm font-medium disabled:opacity-60"
              >
                {pending ? "保存中…" : "确认"}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ChangePwModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await changeStaffPasswordAction(userId, pw);
      if (r?.error) { toast.error(r.error); return; }
      toast.success("密码已更改");
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">修改密码</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="新密码（至少 8 位）"
            minLength={8}
            required
            autoFocus
            className="w-full h-10 px-3 rounded border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full h-10 rounded bg-zinc-900 text-white text-sm font-medium disabled:opacity-60"
          >
            {pending ? "保存中…" : "确认修改"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateStaffForm({
  roles,
  onCreated,
  onCancel,
}: {
  roles: RoleRow[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [newCreds, setNewCreds] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createStaffAction(undefined, fd);
      if (!r) return;
      if ("error" in r) { setError(r.error); return; }
      if ("ok" in r) setNewCreds({ username: r.username, password: r.password });
    });
  }

  if (newCreds) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 space-y-3">
        <p className="text-sm font-medium text-emerald-800">✓ 账号已创建 — 请将以下信息告知员工（密码只显示一次）</p>
        <div className="grid grid-cols-2 gap-3 font-mono text-sm">
          <div>
            <div className="text-xs text-emerald-600 mb-1">用户名</div>
            <div className="bg-white rounded px-3 py-2 border border-emerald-200 select-all">{newCreds.username}</div>
          </div>
          <div>
            <div className="text-xs text-emerald-600 mb-1">初始密码</div>
            <div className="bg-white rounded px-3 py-2 border border-emerald-200 select-all">{newCreds.password}</div>
          </div>
        </div>
        <button
          onClick={onCreated}
          className="h-9 px-4 rounded bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition"
        >
          完成
        </button>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium flex items-center gap-2">
          <Plus size={16} className="text-zinc-500" />新建后台账号
        </h2>
        <button onClick={onCancel} className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">用户名 <span className="text-red-500">*</span></span>
            <input
              name="username"
              required
              placeholder="仅字母、数字、下划线"
              className="h-10 px-3 rounded border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">显示名称</span>
            <input
              name="displayName"
              placeholder="（留空则与用户名相同）"
              className="h-10 px-3 rounded border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">系统角色</span>
            <select
              name="role"
              defaultValue="agent"
              className="h-10 px-3 rounded border border-zinc-300 text-sm bg-white"
            >
              <option value="agent">代理（Agent）</option>
              <option value="admin">超级管理员（Admin）</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">自定义角色</span>
            <select
              name="adminRoleId"
              className="h-10 px-3 rounded border border-zinc-300 text-sm bg-white"
            >
              <option value="">不指定</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-6 rounded bg-zinc-900 text-white text-sm font-medium disabled:opacity-60 hover:bg-zinc-700 transition"
        >
          {pending ? "创建中…" : "创建账号（系统自动生成密码）"}
        </button>
      </form>
    </section>
  );
}

// ─── Tab 2: Roles ────────────────────────────────────────────────────────────

function RolesTab({ roles }: { roles: RoleRow[] }) {
  const router = useRouter();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    roles[0]?.id ?? null
  );

  const selectedRole = roles.find(r => r.id === selectedRoleId) ?? null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        设置每个角色可访问的功能模块。超级管理员始终拥有全部权限。
      </p>

      {/* Role chips */}
      <div className="flex flex-wrap gap-2">
        {roles.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRoleId(r.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              r.id === selectedRoleId
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500"
            }`}
          >
            {r.name}
            {r.is_system && (
              <span className="ml-1.5 text-[9px] uppercase tracking-wide opacity-60">系统</span>
            )}
          </button>
        ))}
      </div>

      {/* Inline role editor */}
      {selectedRole && (
        <RoleEditor
          key={selectedRole.id}
          role={selectedRole}
          onSaved={() => router.refresh()}
          onDeleted={() => {
            const next = roles.find(r => r.id !== selectedRole.id);
            setSelectedRoleId(next?.id ?? null);
            router.refresh();
          }}
        />
      )}

      {/* Create new role */}
      <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
        <h2 className="font-medium flex items-center gap-2">
          <Plus size={16} className="text-zinc-500" />创建新角色
        </h2>
        <CreateRoleForm modules={MODULE_LABELS} />
      </section>
    </div>
  );
}

function RoleEditor({
  role,
  onSaved,
  onDeleted,
}: {
  role: RoleRow;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(role.name);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_MODULES.map(m => [m, role.permissions[m] ?? false]))
  );
  const [pending, startTransition] = useTransition();

  function toggle(m: string) {
    setPermissions(p => ({ ...p, [m]: !p[m] }));
  }

  function handleSave() {
    startTransition(async () => {
      const r = await updateRoleAction(role.id, name, permissions);
      if ("error" in r) { toast.error(r.error); return; }
      toast.success("角色已保存");
      onSaved();
    });
  }

  function handleDelete() {
    if (!confirm(`确认删除角色「${role.name}」？已分配该角色的账号将失去自定义权限。`)) return;
    startTransition(async () => {
      const r = await deleteRoleAction(role.id);
      if ("error" in r) { toast.error(r.error); return; }
      toast.success("角色已删除");
      onDeleted();
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-zinc-400" />
          <h2 className="font-medium">{role.name}</h2>
          {role.is_system && (
            <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
              系统
            </span>
          )}
        </div>
        {!role.is_system && (
          <button
            onClick={handleDelete}
            disabled={pending}
            className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
          >
            删除角色
          </button>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-sm max-w-xs">
        <span className="text-xs font-medium text-zinc-500">角色名称</span>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={role.is_system}
          className="h-9 px-3 rounded border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400"
        />
      </label>

      <div>
        <div className="text-xs font-medium text-zinc-500 mb-2">可访问模块</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_MODULES.map(m => (
            <label
              key={m}
              className={`flex items-center gap-2 cursor-pointer select-none text-sm py-1.5 px-3 rounded-md border transition ${
                permissions[m] ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
              } ${role.is_system ? "opacity-50 pointer-events-none" : ""}`}
            >
              <input
                type="checkbox"
                checked={permissions[m] ?? false}
                onChange={() => toggle(m)}
                disabled={role.is_system}
                className="h-4 w-4 rounded"
              />
              <span>{MODULE_LABELS[m] ?? m}</span>
            </label>
          ))}
        </div>
      </div>

      {!role.is_system && (
        <button
          onClick={handleSave}
          disabled={pending}
          className="h-9 px-5 rounded bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-60"
        >
          {pending ? "保存中…" : "保存权限"}
        </button>
      )}
    </div>
  );
}
