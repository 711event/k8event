import Link from "next/link";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";
import { RetentionForm } from "./RetentionForm";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";

export const metadata = { title: "Chat Retention Policy · Admin Panel" };
export const dynamic = "force-dynamic";

export default async function ChatRetentionPage() {
  await requireRole("admin");
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);
  const supabase = await createSupabaseServerClient();

  const { data: settings } = await supabase
    .from("chat_retention_settings")
    .select("*")
    .eq("group_id", getGroupId())
    .maybeSingle();

  const defaults = {
    message_retention_days: settings?.message_retention_days ?? 90,
    media_retention_days: settings?.media_retention_days ?? 30,
    archive_closed_threads_after_days: settings?.archive_closed_threads_after_days ?? 7,
    warn_after_minutes: settings?.warn_after_minutes ?? 5,
    critical_after_minutes: settings?.critical_after_minutes ?? 8,
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/admin/chat" className="text-sm text-zinc-500 hover:text-zinc-800">
          {t("retention_back")}
        </Link>
        <h1 className="text-2xl font-semibold mt-2">{t("retention_title")}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {t("retention_subtitle")}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <RetentionForm defaults={defaults} locale={locale} />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-1">
        <p className="font-medium">{t("retention_notice_title")}</p>
        <p>{t("retention_notice_body")}</p>
      </div>
    </div>
  );
}
