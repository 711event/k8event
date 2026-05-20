"use server";

import { cookies } from "next/headers";
import type { FeLocale } from "@/lib/i18n";
import { FE_LOCALE_COOKIE } from "@/lib/i18n";

export async function setFeLocaleAction(locale: FeLocale) {
  const c = await cookies();
  c.set(FE_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });
}
