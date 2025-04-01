import { ThemeToggle } from "@/components/theme-toggle";
import { CurrencyToggle } from "@/components/currency-toggle";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-2xl mx-auto px-6 md:max-w-none md:px-8 lg:px-24">
        <div className="flex h-14 items-center justify-between md:justify-center">
          <div className="flex md:w-full md:max-w-7xl md:items-center">
            <div className="md:mr-4 flex">
              <Link href="/" className="flex items-center md:mr-6 md:space-x-2">
                <span className="font-bold">Verse</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4 md:flex-1 md:justify-end">
              <CurrencyToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 