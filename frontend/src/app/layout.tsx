import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SwasthyaSetu — Rural Healthcare Bridge",
  description: "Bridging every village to healthcare — one phone call, in one's own tongue.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "SwasthyaSetu", statusBarStyle: "black-translucent" },
};

export const viewport = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
