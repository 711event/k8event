import { ChatPresenceProvider } from "./ChatPresenceContext";

/**
 * Layout wrapping the entire /admin/chat section.
 * Mounts the ChatPresenceProvider once so both the inbox and the
 * thread detail pages share the same Supabase Presence channel.
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ChatPresenceProvider>{children}</ChatPresenceProvider>;
}
