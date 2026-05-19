import { redirect } from "next/navigation";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { PlayerBottomNav } from "@/components/player/PlayerBottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // No hard auth gate — guests can browse. Only redirect admins/agents away so
  // their tools (admin backend) stay separate from player frontend.
  const user = await getCurrentUser();
  if (user && (user.role === "admin" || user.role === "agent")) {
    redirect("/admin");
  }

  return (
    <div
      data-theme="player"
      className="flex flex-1 flex-col min-h-screen pb-[76px] bg-[var(--bg-base)] text-[var(--text-hi)]"
    >
      <PlayerHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-4 sm:py-6">{children}</main>
      <PlayerBottomNav />
    </div>
  );
}
