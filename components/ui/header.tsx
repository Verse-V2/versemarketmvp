import { ThemeToggle } from "@/components/theme-toggle";
import { CurrencyToggle } from "@/components/currency-toggle";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export function Header() {
  const user = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-0">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center">
            <span className="font-bold">Verse</span>
          </Link>
          <div className="flex items-center justify-end space-x-4">
            <CurrencyToggle />
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 