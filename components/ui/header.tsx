import { ThemeToggle } from "@/components/theme-toggle";
import { CurrencyToggle } from "@/components/currency-toggle";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { Button } from "./button";

export function Header() {
  const user = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="md:flex md:justify-center w-full">
        <div className="container max-w-2xl md:max-w-7xl mx-auto px-6 md:px-8 lg:px-24">
          <div className="flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center">
              <span className="font-bold">Verse</span>
            </Link>
            <div className="flex items-center space-x-4">
              <CurrencyToggle />
              <ThemeToggle />
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                >
                  Sign out
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 