import { redirect } from "next/navigation";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "员工登录 · 711event 管理后台", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.role === "admin") redirect("/admin");
    if (user.role === "agent") redirect("/admin/chat");
    // role=player accidentally hitting backend login while still authed — clear them.
  }
  return (
    <div
      data-theme="player"
      className="relative flex flex-1 items-center justify-center px-4 py-12 bg-[var(--bg-base)] text-[var(--text-hi)] min-h-screen overflow-hidden"
    >
      <FieldGrid />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 10%, rgba(255,200,87,0.15), transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--gold-300)] to-[var(--gold-600)] font-[family-name:var(--font-display)] text-[var(--text-on-gold)] font-bold text-lg mb-3 tracking-tight">
            711
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold tracking-tight">
            711event 管理后台
          </h1>
          <p className="text-sm text-[var(--text-mid)] mt-1.5">员工登录</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-5">
          <LoginForm />
        </div>
        <p className="text-center text-[11px] text-[var(--text-lo)]">仅限授权员工 · 此页未对外公开</p>
      </div>
    </div>
  );
}

// Local copy of FieldGridOverlay to avoid pulling player-only components into backend.
// (Same SVG pattern used on the player login screen.)
function FieldGrid() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full opacity-[0.06] text-white pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="g-bg" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#g-bg)" />
    </svg>
  );
}
