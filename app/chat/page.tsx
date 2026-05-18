import { ChatRoom } from "./ChatRoom";

export const metadata = { title: "Chat with us · k8event" };

export default function ChatPage() {
  return (
    <div className="flex flex-1 flex-col h-[100dvh] max-h-[100dvh]">
      <ChatRoom />
    </div>
  );
}
