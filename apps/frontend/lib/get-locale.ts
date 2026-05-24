import { cookies } from "next/headers";
import type { FeLocale } from "./i18n";
import { FE_LOCALE_COOKIE } from "./i18n";

export async function getFeLocale(): Promise<FeLocale> {
  const c = await cookies();
  const v = c.get(FE_LOCALE_COOKIE)?.value;
  if (v === "zh" || v === "en" || v === "ms") return v;
  return "ms";
}
