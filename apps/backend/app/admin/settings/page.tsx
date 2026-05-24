import { requireRole } from "@k8event/shared/auth/require-role";
import { getGroupBranding } from "@/lib/get-branding";
import { BrandSettingsForm } from "./BrandSettingsForm";

export const metadata = { title: "品牌设置 · 管理后台" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireRole("admin");
  const branding = await getGroupBranding();
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">品牌设置</h1>
        <p className="text-sm text-zinc-500 mt-1">上传公司 Logo，更换后全站同步显示。建议尺寸：170×85 px，PNG/WebP 格式。</p>
      </div>
      <BrandSettingsForm branding={branding} />
    </div>
  );
}
