// ภาษา ไทย / English — ใช้ t('ข้อความไทย', 'English') แบบเดียวกับไฟล์แบบ
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { store } from './storage';

export type Lang = 'th' | 'en';
export type TFn = (th: string, en: string) => string;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: TFn }>({
  lang: 'th',
  setLang: () => {},
  t: (th) => th,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('th');
  useEffect(() => {
    store.get<Lang | null>('lang', null).then((l) => {
      if (l === 'th' || l === 'en') setLangState(l);
    });
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    store.set('lang', l);
  }, []);
  const t = useCallback<TFn>((th, en) => (lang === 'en' ? en : th), [lang]);
  const v = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;
