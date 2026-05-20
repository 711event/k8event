"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BoLocale } from "@/lib/i18n";
import { setBoLocaleAction } from "@/app/admin/locale-action";

type Ctx = { locale: BoLocale; setLocale: (l: BoLocale) => void; isPending: boolean };
const LangCtx = createContext<Ctx>({ locale: "zh", setLocale: () => {}, isPending: false });

export function useLang() {
  return useContext(LangCtx);
}

export function LangProvider({
  locale: init,
  children,
}: {
  locale: BoLocale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<BoLocale>(init);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setLocale(l: BoLocale) {
    startTransition(async () => {
      await setBoLocaleAction(l);
      setLocaleState(l);
      router.refresh();
    });
  }

  return <LangCtx.Provider value={{ locale, setLocale, isPending }}>{children}</LangCtx.Provider>;
}
