"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FeLocale } from "@/lib/i18n";
import { setFeLocaleAction } from "@/app/locale-action";

type Ctx = { locale: FeLocale; setLocale: (l: FeLocale) => void; isPending: boolean };
const LangCtx = createContext<Ctx>({ locale: "zh", setLocale: () => {}, isPending: false });

export function useFeLang() {
  return useContext(LangCtx);
}

export function LangProvider({
  locale: init,
  children,
}: {
  locale: FeLocale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<FeLocale>(init);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setLocale(l: FeLocale) {
    startTransition(async () => {
      await setFeLocaleAction(l);
      setLocaleState(l);
      router.refresh();
    });
  }

  return <LangCtx.Provider value={{ locale, setLocale, isPending }}>{children}</LangCtx.Provider>;
}
