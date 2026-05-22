import type { Metadata } from "next";
import "./globals.css";
import SupabaseProvider from "@/components/providers/SupabaseProvider";

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
    <html lang="sk" className="h-full antialiased relative">
      <body className="min-h-full flex flex-col font-sans">
        <SupabaseProvider session={null}>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
