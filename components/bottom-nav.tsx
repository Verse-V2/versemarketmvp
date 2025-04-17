"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, TrophyIcon, UserIcon, StarIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";

export function BottomNav() {
  const pathname = usePathname();

  // Hide on auth page
  if (pathname === '/auth') {
    return null;
  }

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-around">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 ${
            isActive('/') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs">Home</span>
        </Link>
        <Link
          href="/store"
          className={`flex flex-col items-center justify-center gap-1 ${
            isActive('/store') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <ShoppingBagIcon className="h-6 w-6" />
          <span className="text-xs">Store</span>
        </Link>
        <Link
          href="/my-entries"
          className={`flex flex-col items-center justify-center gap-1 ${
            isActive('/my-entries') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <TrophyIcon className="h-6 w-6" />
          <span className="text-xs">My Entries</span>
        </Link>
        <Link
          href="/rewards"
          className={`flex flex-col items-center justify-center gap-1 ${
            isActive('/rewards') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <StarIcon className="h-6 w-6" />
          <span className="text-xs">Rewards</span>
        </Link>
        <Link
          href="/account"
          className={`flex flex-col items-center justify-center gap-1 ${
            isActive('/account') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <UserIcon className="h-6 w-6" />
          <span className="text-xs">Account</span>
        </Link>
      </div>
    </div>
  );
} 