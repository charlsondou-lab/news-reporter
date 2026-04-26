import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 自家新聞台",
  description: "AI 驅動的個人化新聞閱讀器，自動分類評分，持續學習你的偏好",
};

import { LanguageProvider } from '@/lib/LanguageContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
