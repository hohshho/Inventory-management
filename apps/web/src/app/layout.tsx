import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Script from "next/script";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import "./globals.css";

const rootStyle = {
  "--font-body": '"Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  "--font-display": '"Segoe UI Variable Display", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
} as CSSProperties;

export const metadata: Metadata = {
  title: "Inventory Management",
  description: "Inventory management workspace for web and mobile operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko" style={rootStyle}>
      <body>
        <Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js" strategy="afterInteractive" />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
