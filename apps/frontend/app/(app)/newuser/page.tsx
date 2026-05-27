import { redirect } from "next/navigation";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getFeLocale } from "@/lib/get-locale";
import { NewUserClient } from "./NewUserClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "设置密码" };

export default async function NewUserPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?newuser=1");

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  const username = profile?.username ?? user.email?.split("@")[0] ?? "player";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const loginUrl = `${siteUrl}/login`;
  const locale = await getFeLocale();

  return (
    <div className="max-w-sm mx-auto py-8 px-4">
      <NewUserClient username={username} loginUrl={loginUrl} locale={locale} />
    </div>
  );
}
