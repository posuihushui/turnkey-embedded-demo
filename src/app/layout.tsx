import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@turnkey/react-wallet-kit/styles.css";
import "./globals.css";
import { publicDemoConfig } from "@/lib/demo-config";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Turnkey Sui Vault Demo",
  description: "Next.js embedded wallet and vault deposit demo powered by Turnkey and Sui.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers config={publicDemoConfig}>{children}</Providers>
      </body>
    </html>
  );
}
