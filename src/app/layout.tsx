import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Providers from "./providers";
import ConditionalLayout from "@/components/layouts/ConditionalLayout";
import NextTopLoader from 'nextjs-toploader';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoneyMap",
  description: "Track your finances with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader 
          color="#2DD4BF"
          height={3}
          showSpinner={false}
          speed={200}
          shadow="0 0 10px #2DD4BF,0 0 5px #2DD4BF"
        />
        <Providers>
          <main className="flex h-screen">
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </main>
          <Toaster position="bottom-right"/>
        </Providers>
      </body>
    </html>
  );
}