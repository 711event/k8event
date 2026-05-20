"use server";

import { cookies } from "next/headers";
import type { BoLocale } from "@/lib/i18n";
import { BO_LOCALE_COOKIE } from "@/lib/i18n";

export async function setBoLocaleAction(locale: BoLocale) {
  const c = await cookies();
  c.set(BO_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });
}
