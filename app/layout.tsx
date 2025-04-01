import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BetSlipProvider } from "@/lib/bet-slip-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { BetSlip } from "@/components/ui/bet-slip";
import { BottomNav } from "@/components/bottom-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-16`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CurrencyProvider>
            <BetSlipProvider>
              {children}
              <BetSlip />
              <BottomNav />
            </BetSlipProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
