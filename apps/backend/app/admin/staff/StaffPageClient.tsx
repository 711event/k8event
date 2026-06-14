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
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";

const ALL_MODULES = [
  "overview",
  "players",
  "recharge",
  "activities",
  "rewards",
  "redemptions",
  "checkins",
  "chat",
  "quick_replies",
  "staff",
  "roles",
];

type StaffRow = {
  user_id: string;
  username: string | null;
  display_name: string;
  role: "admin" | "agent";
  created_at: string;
  admin_role_id: string | null;
  admin_roles: { name: string; slug: string | null; is_system: boolean | null } | null;
};

type RoleRow = {
  id: string;
  name: string;
  slug: string;
  permissions: Record<string, boolean>;
  is_system: boolean;
  sort_order: number;
};

// System roles store a fixed Chinese name in the DB; map their slug to an i18n
// key so they render in the active locale. Custom roles keep their own name.
const SYSTEM_ROLE_KEY: Record<string, Parameters<typeof tBo>[1]> = {
  super_admin: "staff_role_admin",
  group_admin: "staff_role_group_admin",
  group_agent: "staff_role_agent",
};
function displayRoleName(
  role: { name: string; slug?: string | null; is_system?: boolean | null },
  locale: import("@/lib/i18n").BoLocale,
): string {
  if (role.is_system && role.slug && SYSTEM_ROLE_KEY[role.slug]) {
    return tBo(locale, SYSTEM_ROLE_KEY[role.slug]);
  }
  return role.name;
}

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
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const [activeTab, setActiveTab] = useState<"accounts" | "roles">(defaultTab);

  function switchTab(tab: "accounts" | "roles") {
    setActiveTab(tab);
    router.push(`/admin/staff?tab=${tab}`, { scroll: false });
  }

  const showTabs = canSeeStaff && canSeeRoles;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">{t("staff_title")}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t("staff_subtitle")}</p>
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
            {t("staff_tab_accounts")}
          </button>
          <button
            onClick={() => switchTab("roles")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "roles"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t("staff_tab_roles")}
          </button>
        </div>
      )}

      {activeTab === "accounts" && canSeeStaff && (
        <AccountsTab staffList={staffList} roles={roles} locale={locale} />
      )}
      {activeTab === "roles" && canSeeRoles && (
        <RolesTab roles={roles} locale={locale} />
      )}
    </div>
  );
}

// ─── Tab 1: Accounts ────────────────────────────────────────────────────────

function AccountsTab({ staffList, roles, locale }: { staffList: StaffRow[]; roles: RoleRow[]; locale: import("@/lib/i18n").BoLocale }) {
  const [showCreate, setShowCreate] = useState(false);
  const [changePwUserId, setChangePwUserId] = useState<string | null>(null);
  const router = useRouter();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{t("staff_count", { count: staffList.length })}</p>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition"
        >
          <Plus size={15} />
          {t("staff_create")}
        </button>
      </div>

      <div className="rounded-lg border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{t("staff_col_username")}</th>
              <th className="px-4 py-3 font-medium">{t("staff_col_role")}</th>
              <th className="px-4 py-3 font-medium">{t("staff_col_created")}</th>
              <th className="px-4 py-3 font-medium w-24">{t("staff_col_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-zinc-400 text-center">
                  {t("staff_empty")}
                </td>
              </tr>
            ) : (
              staffList.map(row => (
                <StaffRowItem
                  key={row.user_id}
                  row={row}
                  roles={roles}
                  locale={locale}
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
          locale={locale}
          onCreated={() => { setShowCreate(false); router.refresh(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {changePwUserId && (
        <ChangePwModal
          userId={changePwUserId}
          locale={locale}
          onClose={() => setChangePwUserId(null)}
        />
      )}
    </div>
  );
}

function StaffRowItem({
  row, roles, locale, onChangePw, onRefresh,
}: {
  row: StaffRow;
  roles: RoleRow[];
  locale: import("@/lib/i18n").BoLocale;
  onChangePw: () => void;
  onRefresh: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [editRole, setEditRole] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(row.admin_role_id ?? "");
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  const systemBadge = row.role === "admin"
    ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{t("staff_role_admin")}</span>
    : <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{t("staff_role_agent")}</span>;

  const customRoleName = row.admin_roles
    ? displayRoleName(row.admin_roles, locale)
    : null;

  const createdAt = new Date(row.created_at).toLocaleDateString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });

  function handleDelete() {
    if (!confirm(t("staff_delete_confirm", { name: row.username ?? row.display_name }))) return;
    startTransition(async () => {
      const r = await deleteStaffAction(row.user_id);
      if (r?.error) { toast.error(r.error); return; }
      toast.success(t("staff_deleted"));
      onRefresh();
    });
  }

  function handleAssignRole() {
    startTransition(async () => {
      const r = await assignRoleAction(row.user_id, selectedRoleId || null);
      if (r?.error) { toast.error(r.error); return; }
      toast.success(t("staff_role_updated"));
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
              {editRole ? t("staff_cancel") : t("staff_change_role")}
            </button>
          </div>
        </td>
        <td className="px-4 py-3 text-zinc-500 text-xs">{createdAt}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={onChangePw}
              title={t("staff_change_pw_title")}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition"
            >
              <KeyRound size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={pending}
              title={t("staff_deleted")}
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
                <option value="">{t("staff_no_custom_role")}</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{displayRoleName(r, locale)}</option>
                ))}
              </select>
              <button
                onClick={handleAssignRole}
                disabled={pending}
                className="h-9 px-4 rounded bg-zinc-900 text-white text-sm font-medium disabled:opacity-60"
              >
                {pending ? t("staff_saving") : t("staff_confirm")}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ChangePwModal({ userId, locale, onClose }: { userId: string; locale: import("@/lib/i18n").BoLocale; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [pending, startTransition] = useTransition();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await changeStaffPasswordAction(userId, pw);
      if (r?.error) { toast.error(r.error); return; }
      toast.success(t("staff_pw_changed"));
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("staff_change_pw_title")}</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder={t("staff_pw_placeholder")}
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
            {pending ? t("staff_pw_saving") : t("staff_pw_save")}
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateStaffForm({
  roles,
  locale,
  onCreated,
  onCancel,
}: {
  roles: RoleRow[];
  locale: import("@/lib/i18n").BoLocale;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [newCreds, setNewCreds] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

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
        <p className="text-sm font-medium text-emerald-800">{t("staff_created_msg")}</p>
        <div className="grid grid-cols-2 gap-3 font-mono text-sm">
          <div>
            <div className="text-xs text-emerald-600 mb-1">{t("staff_created_username")}</div>
            <div className="bg-white rounded px-3 py-2 border border-emerald-200 select-all">{newCreds.username}</div>
          </div>
          <div>
            <div className="text-xs text-emerald-600 mb-1">{t("staff_created_pw")}</div>
            <div className="bg-white rounded px-3 py-2 border border-emerald-200 select-all">{newCreds.password}</div>
          </div>
        </div>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {t("staff_created_pw_note")}
        </p>
        <button
          onClick={onCreated}
          className="h-9 px-4 rounded bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition"
        >
          {t("staff_done")}
        </button>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium flex items-center gap-2">
          <Plus size={16} className="text-zinc-500" />{t("staff_new_title")}
        </h2>
        <button onClick={onCancel} className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t("staff_new_username")} <span className="text-red-500">*</span></span>
            <input
              name="username"
              required
              placeholder={t("staff_new_username_hint")}
              className="h-10 px-3 rounded border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t("staff_new_display")}</span>
            <input
              name="displayName"
              placeholder={t("staff_new_display_hint")}
              className="h-10 px-3 rounded border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t("staff_new_role")}</span>
            <select
              name="role"
              defaultValue="agent"
              className="h-10 px-3 rounded border border-zinc-300 text-sm bg-white"
            >
              <option value="agent">{t("staff_role_agent")} (Agent)</option>
              <option value="admin">{t("staff_role_admin")} (Admin)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t("staff_new_custom_role")}</span>
            <select
              name="adminRoleId"
              className="h-10 px-3 rounded border border-zinc-300 text-sm bg-white"
            >
              <option value="">{t("staff_new_no_role")}</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{displayRoleName(r, locale)}</option>
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
          {pending ? t("staff_new_creating") : t("staff_new_create")}
        </button>
      </form>
    </section>
  );
}

// ─── Tab 2: Roles ────────────────────────────────────────────────────────────

function RolesTab({ roles, locale }: { roles: RoleRow[]; locale: import("@/lib/i18n").BoLocale }) {
  const router = useRouter();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    roles[0]?.id ?? null
  );
  const [showCreate, setShowCreate] = useState(false);
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  const MODULE_LABEL: Record<string, string> = {
    overview: t("module_overview"),
    players: t("module_players"),
    recharge: t("module_recharge"),
    activities: t("module_activities"),
    rewards: t("module_rewards"),
    redemptions: t("module_redemptions"),
    checkins: t("module_checkins"),
    referrals: t("module_referrals"),
    chat: t("module_chat"),
    quick_replies: t("module_quick_replies"),
    staff: t("module_staff"),
    roles: t("module_roles"),
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId) ?? null;

  return (
    <div className="space-y-6">
      {/* Create new role — at top */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {t("staff_roles_subtitle")}
        </p>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition shrink-0"
        >
          <Plus size={15} />
          {t("staff_roles_create")}
        </button>
      </div>

      {showCreate && (
        <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium flex items-center gap-2">
              <Plus size={16} className="text-zinc-500" />{t("staff_roles_create")}
            </h2>
            <button
              onClick={() => setShowCreate(false)}
              className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded"
            >
              <X size={16} />
            </button>
          </div>
          <CreateRoleForm
            modules={MODULE_LABEL}
            onCreated={() => {
              setShowCreate(false);
              router.refresh();
            }}
          />
        </section>
      )}

      {/* Role chips */}
      {roles.length > 0 && (
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
              {displayRoleName(r, locale)}
              {r.is_system && (
                <span className="ml-1.5 text-[9px] uppercase tracking-wide opacity-60">{t("staff_role_system")}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Inline role editor */}
      {selectedRole && (
        <RoleEditor
          key={selectedRole.id}
          role={selectedRole}
          moduleLabel={MODULE_LABEL}
          locale={locale}
          onSaved={() => router.refresh()}
          onDeleted={() => {
            const next = roles.find(r => r.id !== selectedRole.id);
            setSelectedRoleId(next?.id ?? null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function RoleEditor({
  role,
  moduleLabel,
  locale,
  onSaved,
  onDeleted,
}: {
  role: RoleRow;
  moduleLabel: Record<string, string>;
  locale: import("@/lib/i18n").BoLocale;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(role.is_system ? displayRoleName(role, locale) : role.name);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_MODULES.map(m => [m, role.permissions[m] ?? false]))
  );
  const [pending, startTransition] = useTransition();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  function toggle(m: string) {
    setPermissions(p => ({ ...p, [m]: !p[m] }));
  }

  function handleSave() {
    startTransition(async () => {
      const r = await updateRoleAction(role.id, name, permissions);
      if ("error" in r) { toast.error(r.error); return; }
      toast.success(t("staff_role_saved"));
      onSaved();
    });
  }

  function handleDelete() {
    if (!confirm(t("staff_role_delete_confirm", { name: role.name }))) return;
    startTransition(async () => {
      const r = await deleteRoleAction(role.id);
      if ("error" in r) { toast.error(r.error); return; }
      toast.success(t("staff_role_deleted"));
      onDeleted();
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-zinc-400" />
          <h2 className="font-medium">{displayRoleName(role, locale)}</h2>
          {role.is_system && (
            <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
              {t("staff_role_system")}
            </span>
          )}
        </div>
        {!role.is_system && (
          <button
            onClick={handleDelete}
            disabled={pending}
            className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
          >
            {t("staff_role_delete_btn")}
          </button>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-sm max-w-xs">
        <span className="text-xs font-medium text-zinc-500">{t("staff_role_name_label")}</span>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={role.is_system}
          className="h-9 px-3 rounded border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400"
        />
      </label>

      <div>
        <div className="text-xs font-medium text-zinc-500 mb-2">{t("staff_role_modules_label")}</div>
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
              <span>{moduleLabel[m] ?? m}</span>
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
          {pending ? t("staff_saving") : t("staff_role_save_btn")}
        </button>
      )}
    </div>
  );
}
