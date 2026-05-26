import { requireRole } from "@k8event/shared/auth/require-role";
import { getGroupId } from "@/lib/get-group";
import { hasPermission } from "@k8event/shared/auth/has-permission";
import { SignOutButton } from "@k8event/shared/components/SignOutButton";
import { AdminSidebar, type AdminNavItem } from "@/components/admin/AdminSidebar";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { ChatUnreadProvider } from "@/components/admin/ChatUnreadProvider";
import { LangProvider } from "@/components/admin/LangProvider";
import { LangSwitcher } from "@/components/admin/LangSwitcher";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { getGroupBranding } from "@/lib/get-branding";

// Map nav href → permission module key
// /admin/staff covers both "staff" and "roles" (merged page with tabs).
// A user with either permission can access the page; the server component
// shows only the tab(s) they are allowed to see.
const NAV_MODULES: Record<string, string> = {
  "/admin":               "overview",
  "/admin/players":       "players",
  "/admin/recharge":      "recharge",
  "/admin/activities":    "activities",
  "/admin/rewards":       "rewards",
  "/admin/redemptions":   "redemptions",
  "/admin/checkins":      "checkins",
  "/admin/chat":          "chat",
  "/admin/quick-replies": "quick_replies",
  "/admin/staff":         "staff",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin", "agent"]);
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);
  const branding = await getGroupBranding();

  const allNav: AdminNavItem[] = [
    { href: "/admin",               label: t("nav_overview"),     icon: "LayoutDashboard" },
    { href: "/admin/players",       label: t("nav_players"),      icon: "Users" },
    { href: "/admin/recharge",      label: t("nav_recharge"),     icon: "Upload" },
    { href: "/admin/activities",    label: t("nav_activities"),   icon: "LayoutGrid" },
    { href: "/admin/rewards",       label: t("nav_rewards"),      icon: "Gift" },
    { href: "/admin/redemptions",   label: t("nav_redemptions"),  icon: "ClipboardCheck" },
    { href: "/admin/checkins",      label: t("nav_checkins"),     icon: "CalendarCheck" },
    { href: "/admin/chat",          label: t("nav_chat"),         icon: "MessageSquare" },
    { href: "/admin/quick-replies", label: t("nav_quickReplies"), icon: "Zap" },
    { href: "/admin/staff",         label: t("nav_staff"),        icon: "UserCog" },
    { href: "/admin/settings",      label: t("nav_settings"),     icon: "Settings2" },
  ];

  // Filter nav items based on user's permissions.
  // /admin/staff is the merged accounts+roles page — show it if the user
  // has either the "staff" or "roles" permission module.
  const links = allNav.filter((item) => {
    const module = NAV_MODULES[item.href];
    if (!module) return true;
    if (item.href === "/admin/staff") {
      return hasPermission(user, "staff") || hasPermission(user, "roles");
    }
    return hasPermission(user, module);
  });

  // Role badge label: show custom role name if assigned, else the system role
  const roleLabel = user.adminRoleName ?? user.role;

  const groupId = getGroupId();

  return (
    <LangProvider locale={locale}>
      <ChatUnreadProvider groupId={groupId}>
        <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
          <AdminSidebar items={links} userLabel={user.displayName} userRole={roleLabel} branding={branding} subtitle={t("sidebar_subtitle")} />

          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-20 bg-white border-b border-zinc-200 h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AdminMobileNav items={links} userLabel={user.displayName} userRole={roleLabel} branding={branding} />
                <div className="font-semibold text-sm truncate">{t("header_title")}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <LangSwitcher />
                <span className="text-zinc-500 hidden sm:inline truncate max-w-[160px]">
                  {user.displayName}
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide bg-zinc-100 text-zinc-600 rounded px-1.5 py-0.5">
                    {roleLabel}
                  </span>
                </span>
                <SignOutButton />
              </div>
            </header>
            <main className="flex-1 p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </ChatUnreadProvider>
    </LangProvider>
  );
}
