import { createContext, useContext, useEffect, useState } from 'react';
import i18n from './config';

const LanguageContext = createContext(null);

const DEFAULT_LANG = 'ru';
const STORAGE_KEY = 'app_lang';

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(DEFAULT_LANG);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') {
      setLang(saved);
      i18n.changeLanguage(saved);
    } else {
      setLang(i18n.language || DEFAULT_LANG);
    }
  }, []);

  const changeLang = (nextLang) => {
    setLang(nextLang);
    window.localStorage.setItem(STORAGE_KEY, nextLang);
    i18n.changeLanguage(nextLang);
  };

  const value = { lang, setLang: changeLang };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
};

