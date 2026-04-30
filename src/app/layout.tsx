import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono, DM_Serif_Display } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { copy } from "@/lib/copy";
import { Toaster } from "@/components/ui/sonner";
import { ToastFromQuery } from "@/components/toast-from-query";
import { SWRegister } from "@/components/sw-register";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#bb5a3c",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: copy.app.title,
  description: copy.app.description,
  formatDetection: { telephone: false, email: false, address: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${dmSans.variable} ${dmMono.variable} ${dmSerifDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground safe-area">
        {children}
        <Suspense fallback={null}>
          <ToastFromQuery />
        </Suspense>
        <SWRegister />
        <Toaster />
      </body>
    </html>
  );
}
