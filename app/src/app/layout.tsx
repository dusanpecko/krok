import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SupabaseProvider from "@/components/providers/SupabaseProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "KROK – Pastoračný fond Žilinskej diecézy",
  description: "Platforma pre správu pastoračného fondu KROK – darcovia, projekty, finančné prehľady.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <SupabaseProvider session={null}>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
