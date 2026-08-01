"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  LANGUAGE_OPTIONS,
} from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const LOCALE_STORAGE_KEY = "toyoko-korea-locale";
const LOCALE_COOKIE = "toyoko_locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  "zh-CN": "zh_CN",
  "en-US": "en_US",
  "ja-JP": "ja_JP",
  "ko-KR": "ko_KR",
};

type I18nContextValue = {
  locale: Locale;
  messages: ReturnType<typeof getMessages>;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function browserLocale(): Locale {
  for (const candidate of navigator.languages) {
    const normalized = candidate.toLowerCase();
    if (normalized.startsWith("zh")) return "zh-CN";
    if (normalized.startsWith("ja")) return "ja-JP";
    if (normalized.startsWith("ko")) return "ko-KR";
    if (normalized.startsWith("en")) return "en-US";
  }
  return DEFAULT_LOCALE;
}

function storedLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Language selection still works when browser storage is unavailable.
  }

  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
  return isLocale(cookie) ? cookie : null;
}

function updateMetaContent(selector: string, content: string) {
  document
    .querySelector<HTMLMetaElement>(selector)
    ?.setAttribute("content", content);
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const persistLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // The in-memory choice remains active without localStorage.
    }
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const preferredLocale = storedLocale() ?? browserLocale();
      if (preferredLocale !== locale) persistLocale(preferredLocale);
      else document.documentElement.lang = locale;
    });
    return () => cancelAnimationFrame(frame);
  }, [locale, persistLocale]);

  useEffect(() => {
    const c = getMessages(locale);
    document.title = c.brand;
    updateMetaContent('meta[name="description"]', c.heroDescription);
    updateMetaContent('meta[property="og:title"]', c.brand);
    updateMetaContent('meta[property="og:description"]', c.heroDescription);
    updateMetaContent(
      'meta[property="og:locale"]',
      OPEN_GRAPH_LOCALES[locale],
    );
    updateMetaContent('meta[property="og:image:alt"]', c.brand);
    updateMetaContent('meta[name="twitter:title"]', c.brand);
    updateMetaContent('meta[name="twitter:description"]', c.heroDescription);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, messages: getMessages(locale), setLocale: persistLocale }),
    [locale, persistLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

export function LanguageSwitcher() {
  const { locale, messages: c, setLocale } = useI18n();

  return (
    <label className="language-switcher">
      <span className="language-icon" aria-hidden="true">
        文
      </span>
      <span className="language-switcher-copy">
        <small>{c.language.label}</small>
        <select
          value={locale}
          aria-label={c.language.selectLabel}
          onChange={(event) => setLocale(event.target.value as Locale)}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option value={option.locale} key={option.locale}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
