import { requireRole } from "@k8event/shared/auth/require-role";
import { getGroupBranding } from "@/lib/get-branding";
import { BrandSettingsForm } from "./BrandSettingsForm";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";

export const metadata = { title: "Brand Settings · Admin Panel" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireRole("admin");
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);
  const branding = await getGroupBranding();
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">{t("settings_title")}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t("settings_subtitle")}</p>
      </div>
      <BrandSettingsForm branding={branding} locale={locale} />
    </div>
  );
}
