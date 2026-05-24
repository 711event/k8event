import { redirect } from "next/navigation";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { PlayerBottomNav } from "@/components/player/PlayerBottomNav";
import { LangProvider } from "@/components/player/LangProvider";
import { getFeLocale } from "@/lib/get-locale";
import { getGroupBranding } from "@/lib/get-branding";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user && (user.role === "admin" || user.role === "agent")) {
    redirect("/admin");
  }

  const locale = await getFeLocale();
  const branding = await getGroupBranding();

  return (
    <LangProvider locale={locale}>
      <div
        data-theme="player"
        className="flex flex-1 flex-col min-h-screen pb-[76px] bg-[var(--bg-base)] text-[var(--text-hi)]"
      >
        <PlayerHeader locale={locale} user={user} branding={branding} />
        <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-4 sm:py-6">{children}</main>
        <PlayerBottomNav />
      </div>
    </LangProvider>
  );
}
