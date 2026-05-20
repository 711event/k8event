import { requireRole } from "@k8event/shared/auth/require-role";
import { SignOutButton } from "@k8event/shared/components/SignOutButton";
import { AdminSidebar, type AdminNavItem } from "@/components/admin/AdminSidebar";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { ChatUnreadProvider } from "@/components/admin/ChatUnreadProvider";
import { LangProvider } from "@/components/admin/LangProvider";
import { LangSwitcher } from "@/components/admin/LangSwitcher";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin", "agent"]);
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);

  const adminNav: AdminNavItem[] = [
    { href: "/admin",               label: t("nav_overview"),     icon: "LayoutDashboard" },
    { href: "/admin/players",       label: t("nav_players"),      icon: "Users" },
    { href: "/admin/recharge",      label: t("nav_recharge"),     icon: "Upload" },
    { href: "/admin/activities",    label: t("nav_activities"),   icon: "LayoutGrid" },
    { href: "/admin/rewards",       label: t("nav_rewards"),      icon: "Gift" },
    { href: "/admin/redemptions",   label: t("nav_redemptions"),  icon: "ClipboardCheck" },
    { href: "/admin/checkins",      label: t("nav_checkins"),     icon: "CalendarCheck" },
    { href: "/admin/chat",          label: t("nav_chat"),         icon: "MessageSquare" },
    { href: "/admin/quick-replies", label: t("nav_quickReplies"), icon: "Zap" },
  ];

  const links =
    user.role === "agent"
      ? adminNav.filter((l) => l.href === "/admin/chat" || l.href === "/admin/quick-replies")
      : adminNav;

  return (
    <LangProvider locale={locale}>
      <ChatUnreadProvider>
        <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
          <AdminSidebar items={links} userLabel={user.displayName} userRole={user.role} />

          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-20 bg-white border-b border-zinc-200 h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AdminMobileNav items={links} userLabel={user.displayName} userRole={user.role} />
                <div className="font-semibold text-sm truncate">{t("header_title")}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <LangSwitcher />
                <span className="text-zinc-500 hidden sm:inline truncate max-w-[160px]">
                  {user.displayName}
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide bg-zinc-100 text-zinc-600 rounded px-1.5 py-0.5">
                    {user.role}
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
