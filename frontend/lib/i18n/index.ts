import { useCallback } from 'react';
import { useLanguageStore, type Language } from '@/stores/language-store';
import en from './en';
import uz from './uz';
import ru from './ru';

const translations: Record<Language, Record<string, string>> = { en, uz, ru };

export function useTranslation() {
  const language = useLanguageStore((s) => s.language);
  const dict = translations[language] ?? translations.en;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let value = dict[key] ?? translations.en[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v));
        });
      }
      return value;
    },
    [dict],
  );

  return { t, language };
}

export { type Language } from '@/stores/language-store';
