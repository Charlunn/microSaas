import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Landing // KINETIC_ENGINE",
  description: "Micro-SaaS Factory main landing"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
