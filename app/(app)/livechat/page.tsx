import { ChatRoom } from "./ChatRoom";

export const metadata = { title: "客服 · k8event" };

export default function LiveChatPage() {
  // Inside (app) layout: top header ~56px sticky, bottom nav ~76px fixed.
  // Fill the available area (subtract header height) and let ChatRoom handle internal scroll.
  return (
    <div
      className="flex flex-col -mx-4 -my-4 sm:-my-6 rounded-none sm:rounded-[var(--radius-md)] sm:border sm:border-[var(--border-strong)] bg-[var(--bg-base)] sm:bg-[var(--bg-elevated)] overflow-hidden"
      style={{ height: "calc(100dvh - 56px - 76px)" }}
    >
      <ChatRoom />
    </div>
  );
}
