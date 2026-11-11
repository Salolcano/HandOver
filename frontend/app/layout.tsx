import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { WalletProvider } from "@/components/wallet-provider";

const display = Archivo({ subsets: ["latin"], weight: ["800"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Handover - prove the work is handed over",
  description:
    "A client and a contractor agree a handover checklist. Evidence goes on the record, GenLayer validators verify it, and the final payment follows the result.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${body.variable}`}>
      <body>
        <WalletProvider>
          <SiteHeader />
          <main>{children}</main>
          <footer className="hair" style={{ marginTop: 120 }}>
            <div className="wrap" style={{ padding: "32px 24px", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between" }}>
              <span className="label">&copy; 2026 handover. MIT license. Built on GenLayer Studio Next.</span>
              <span className="label">the work isn&rsquo;t done until it&rsquo;s proven.</span>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
