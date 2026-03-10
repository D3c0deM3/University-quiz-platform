import { create } from 'zustand';

export type Language = 'en' | 'uz' | 'ru';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: (typeof window !== 'undefined' ? localStorage.getItem('language') as Language : null) || 'en',
  setLanguage: (lang) => {
    if (typeof window !== 'undefined') localStorage.setItem('language', lang);
    set({ language: lang });
  },
}));
