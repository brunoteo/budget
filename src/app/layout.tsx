import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { copy } from "@/lib/copy";
import { Toaster } from "@/components/ui/sonner";
import { ToastFromQuery } from "@/components/toast-from-query";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: copy.app.title,
  description: copy.app.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-clay-50 text-clay-900 safe-area">
        {children}
        <Suspense fallback={null}>
          <ToastFromQuery />
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
