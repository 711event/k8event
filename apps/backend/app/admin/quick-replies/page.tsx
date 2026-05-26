import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";
import { QuickRepliesManager } from "./QuickRepliesManager";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";

export const metadata = { title: "Quick Replies · Admin Panel" };
export const dynamic = "force-dynamic";

export default async function QuickRepliesPage() {
  await requireRole(["admin", "agent"]);
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);
  const supabase = await createSupabaseServerClient();
  const { data: replies } = await supabase
    .from("quick_replies")
    .select("id, title, body, sort_order, is_active, image_url")
    .eq("group_id", getGroupId())
    .order("sort_order")
    .order("title");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t("quick_replies_title")}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("quick_replies_tip")}
          </p>
        </div>
      </div>
      <QuickRepliesManager replies={replies ?? []} />
    </div>
  );
}
