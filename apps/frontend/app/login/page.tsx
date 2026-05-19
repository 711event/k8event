import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { FieldGridOverlay } from "@/components/player/FieldGridOverlay";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "登录 · 711event" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" || user.role === "agent" ? "/admin" : "/event");
  }
  return (
    <div
      data-theme="player"
      className="relative flex flex-1 items-center justify-center px-4 py-12 bg-[var(--bg-base)] text-[var(--text-hi)] min-h-screen overflow-hidden"
    >
      <FieldGridOverlay />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 10%, rgba(255,200,87,0.15), transparent 60%)",
        }}
      />

      <Link
        href="/livechat"
        className="absolute top-4 right-4 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[var(--border-strong)] bg-[var(--bg-elevated)]/80 backdrop-blur text-xs text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:border-[var(--gold-500)]/40 transition"
      >
        <MessageCircle size={14} />
        联系客服
      </Link>

      <div className="relative w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--gold-300)] to-[var(--gold-600)] font-[family-name:var(--font-display)] text-[var(--text-on-gold)] font-bold text-lg mb-3 tracking-tight">
            711
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">711event</h1>
          <p className="text-sm text-[var(--text-mid)] mt-1.5">免费畅聊 · 竞猜赢豪礼,天天来领奖</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-5">
          <LoginForm />
        </div>
        <p className="text-center text-xs text-[var(--text-lo)]">
          <Link href="/event" className="text-[var(--gold-300)] hover:text-[var(--gold-500)] transition">
            先逛逛 →
          </Link>
        </p>
      </div>
    </div>
  );
}
