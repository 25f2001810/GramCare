import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.json';
import ta from './ta.json';
import hi from './hi.json';

const LANGUAGE_KEY = 'gramcare-language';
const TEXT_SIZE_KEY = 'gramcare-text-size';
const dictionaries = { en, ta, hi };
const context = createContext(null);

function storedLanguage() {
  const value = globalThis.localStorage?.getItem(LANGUAGE_KEY);
  return Object.hasOwn(dictionaries, value) ? value : 'en';
}

export function translate(key, language = storedLanguage()) {
  return dictionaries[language]?.[key] ?? en[key] ?? key;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(storedLanguage);
  const setLanguage = useCallback((value) => {
    if (!Object.hasOwn(dictionaries, value)) throw new Error(`Unsupported language: ${value}`);
    setLanguageState(value);
  }, []);
  const t = useCallback((key) => translate(key, language), [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  useEffect(() => {
    globalThis.localStorage?.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.classList.toggle('large-text', loadTextSize() === 'large');
  }, [language]);

  return createElement(context.Provider, { value }, children);
}

export function useLanguage() {
  const value = useContext(context);
  if (!value) throw new Error('useLanguage must be used within LanguageProvider.');
  return value;
}

export function loadTextSize() {
  return globalThis.localStorage?.getItem(TEXT_SIZE_KEY) === 'large' ? 'large' : 'normal';
}

export function saveTextSize(value) {
  if (!['normal', 'large'].includes(value)) throw new Error(`Unsupported text size: ${value}`);
  globalThis.localStorage?.setItem(TEXT_SIZE_KEY, value);
  document.documentElement.classList.toggle('large-text', value === 'large');
}
