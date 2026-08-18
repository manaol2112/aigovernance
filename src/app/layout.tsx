import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getColorTheme } from "@/lib/theme-settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Governance | Crosswalk & Assessment",
  description: "Enterprise AI governance crosswalk and assessment platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const colorTheme = await getColorTheme();

  return (
    <html
      lang="en"
      data-theme={colorTheme}
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
