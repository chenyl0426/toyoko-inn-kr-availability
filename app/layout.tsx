import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "韩国东横INN房况查询";
const description =
  "按地区选择韩国东横 INN，一次比较所选酒店的实时余房、房型、住宿计划和官网价格。";

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f9ff",
};

export async function generateMetadata(): Promise<Metadata> {
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
      locale: "zh_CN",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
