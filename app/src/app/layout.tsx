import type { Metadata } from "next";
import "./globals.css";
import SupabaseProvider from "@/components/providers/SupabaseProvider";
import Script from "next/script";

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
    <html lang="sk" className="h-full antialiased relative" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col font-sans">
        <SupabaseProvider session={null}>
          {children}
        </SupabaseProvider>
        {/* Umami Analytics */}
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="bd55db02-e225-436f-9095-645bec96ed34"
        />
      </body>
    </html>
  );
}

