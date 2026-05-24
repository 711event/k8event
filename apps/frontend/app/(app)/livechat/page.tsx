import { ChatRoom } from "./ChatRoom";
import { getGroupBranding } from "@/lib/get-branding";

export const metadata = { title: "客服 · 711event" };
export const dynamic = "force-dynamic";

export default async function LiveChatPage() {
  const branding = await getGroupBranding();
  // Inside (app) layout: top header ~56px sticky, bottom nav ~76px fixed.
  // Fill the available area and let ChatRoom handle internal scroll.
  return (
    <div
      className="flex flex-col -mx-4 -my-4 sm:-mx-0 sm:-my-6 sm:rounded-[var(--radius-md)] sm:border sm:border-[var(--border-strong)] bg-[var(--bg-elevated)] overflow-hidden shadow-[var(--shadow-card)]"
      style={{ height: "calc(100dvh - 56px - 76px)" }}
    >
      <ChatRoom agentLogoUrl={branding.logo_url} agentName={branding.company_name} />
    </div>
  );
}
