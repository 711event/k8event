import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Login — k8event" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" || user.role === "agent" ? "/admin" : "/dashboard");
  }
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">k8event</h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in with your username</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
