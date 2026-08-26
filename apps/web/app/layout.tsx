import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./styles.css";

export const metadata: Metadata = {
  title: "GEO 优化｜看见品牌在 AI 中的真实表现",
  description: "面向中小企业与门店的 GEO 评测、内容优化与媒体发布平台",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
