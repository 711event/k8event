import { cookies } from "next/headers";
import type { BoLocale } from "./i18n";
import { BO_LOCALE_COOKIE } from "./i18n";

export async function getBoLocale(): Promise<BoLocale> {
  const c = await cookies();
  const v = c.get(BO_LOCALE_COOKIE)?.value;
  return v === "en" ? "en" : "zh";
}
