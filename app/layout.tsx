import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BetSlipProvider } from "@/lib/bet-slip-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { EntriesProvider } from "@/lib/entries-context";
import { AuthProvider } from "@/lib/auth-context";
import { UserBalanceProvider } from "@/lib/user-balance-context";
import { BetSlip } from "@/components/ui/bet-slip";
import { BottomNav } from "@/components/bottom-nav";
import { ImagePreloader } from "@/components/ui/image-preloader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Verse Gaming MVP",
  description: "A Sweepstakes Prediction Market for the Verse Community",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-16 md:overflow-auto overflow-auto md:scrollbar no-scrollbar`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <AuthProvider>
            <UserBalanceProvider>
              <CurrencyProvider>
                <EntriesProvider>
                  <BetSlipProvider>
                    <ImagePreloader />
                    {children}
                    <BetSlip />
                    <BottomNav />
                  </BetSlipProvider>
                </EntriesProvider>
              </CurrencyProvider>
            </UserBalanceProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
