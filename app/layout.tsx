import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { I18nProvider } from "@/app/i18n-provider";
import { DEFAULT_LOCALE, getMessages, isLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import "./globals.css";

const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  "zh-CN": "zh_CN",
  "en-US": "en_US",
  "ja-JP": "ja_JP",
  "ko-KR": "ko_KR",
};

function localeFromAcceptLanguage(value: string | null): Locale {
  if (!value) return DEFAULT_LOCALE;
  const candidates = value
    .split(",")
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q="),
      );
      const quality = qualityParameter
        ? Number(qualityParameter.trim().slice(2))
        : 1;
      return { tag, quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { tag } of candidates) {
    const normalized = tag.toLowerCase();
    if (normalized.startsWith("zh")) return "zh-CN";
    if (normalized.startsWith("en")) return "en-US";
    if (normalized.startsWith("ja")) return "ja-JP";
    if (normalized.startsWith("ko")) return "ko-KR";
  }
  return DEFAULT_LOCALE;
}

async function requestLocale() {
  const value = (await cookies()).get("toyoko_locale")?.value;
  if (isLocale(value)) return value;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f9ff",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const c = getMessages(locale);
  const title = c.brand;
  const description = c.heroDescription;
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = (forwardedHost ?? requestHeaders.get("host") ?? "localhost:3000")
    .split(",")[0]
    .trim();
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol =
    (forwardedProto ?? (host.startsWith("localhost") ? "http" : "https"))
      .split(",")[0]
      .trim() === "http"
      ? "http"
      : "https";
  const origin = `${protocol}://${host}`;
  const previewImage = new URL("/og-hotel-selector.png", origin).toString();

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      locale: OPEN_GRAPH_LOCALES[locale],
      alternateLocale: Object.entries(OPEN_GRAPH_LOCALES)
        .filter(([candidate]) => candidate !== locale)
        .map(([, openGraphLocale]) => openGraphLocale),
      images: [{ url: previewImage, width: 1731, height: 909, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [previewImage],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await requestLocale();

  return (
    <html lang={locale}>
      <body>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
