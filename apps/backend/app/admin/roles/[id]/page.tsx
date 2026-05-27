import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@k8event/shared/auth/require-role";
import { hasPermission } from "@k8event/shared/auth/has-permission";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { RoleEditForm } from "./RoleEditForm";

export const metadata = { title: "Edit Role · Admin Panel" };

export default async function RoleDetailPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["admin"]);
  if (!hasPermission(user, "roles")) notFound();

  const { id } = await props.params;
  const locale = await getBoLocale();

  const MODULE_LABELS: Record<string, string> = {
    overview:      tBo(locale, "module_overview"),
    players:       tBo(locale, "module_players"),
    recharge:      tBo(locale, "module_recharge"),
    activities:    tBo(locale, "module_activities"),
    rewards:       tBo(locale, "module_rewards"),
    redemptions:   tBo(locale, "module_redemptions"),
    checkins:      tBo(locale, "module_checkins"),
    referrals:     tBo(locale, "module_referrals"),
    chat:          tBo(locale, "module_chat"),
    quick_replies: tBo(locale, "module_quick_replies"),
    staff:         tBo(locale, "module_staff"),
    roles:         tBo(locale, "module_roles"),
  };

  const supabase = await createSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: role } = await (supabase as any)
    .from("admin_roles")
    .select("id, name, slug, permissions, is_system")
    .eq("id", id)
    .maybeSingle();

  if (!role) notFound();

  // Count staff assigned to this role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: assignedCount } = await (supabase as any)
    .from("profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("admin_role_id", id);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/roles" className="text-sm text-zinc-500 hover:text-zinc-900 underline">
          {tBo(locale, "role_edit_back")}
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{role.name}</h1>
          {role.is_system && (
            <span className="text-xs uppercase tracking-wide bg-amber-100 text-amber-700 rounded px-2 py-0.5">
              {tBo(locale, "role_edit_system")}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Slug: <code className="font-mono">{role.slug}</code>
          {assignedCount != null && assignedCount > 0 && (
            <span className="ml-3">{tBo(locale, "role_edit_assigned", { count: assignedCount })}</span>
          )}
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 p-5">
        <RoleEditForm
          id={role.id}
          initialName={role.name}
          initialPermissions={role.permissions as Record<string, boolean>}
          isSystem={role.is_system}
          modules={MODULE_LABELS}
        />
      </section>
    </div>
  );
}
