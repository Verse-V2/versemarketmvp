"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, DollarSign, Star, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link 
            href="/" 
            className={`flex flex-col items-center justify-center flex-1 min-w-0 ${
              isActive('/') ? 'text-[#0BC700]' : 'text-muted-foreground'
            }`}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1">Home</span>
          </Link>

          <Link 
            href="/store" 
            className={`flex flex-col items-center justify-center flex-1 min-w-0 ${
              isActive('/store') ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <Store className="h-6 w-6" />
            <span className="text-xs mt-1">Store</span>
          </Link>

          <Link 
            href="/my-entries" 
            className={`flex flex-col items-center justify-center flex-1 min-w-0 ${
              isActive('/my-entries') ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <DollarSign className="h-6 w-6" />
            <span className="text-xs mt-1">My Entries</span>
          </Link>

          <Link 
            href="/favorites" 
            className={`flex flex-col items-center justify-center flex-1 min-w-0 ${
              isActive('/favorites') ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <Star className="h-6 w-6" />
            <span className="text-xs mt-1">Rewards</span>
          </Link>

          <Link 
            href="/account" 
            className={`flex flex-col items-center justify-center flex-1 min-w-0 ${
              isActive('/account') ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">My Account</span>
          </Link>
        </div>
      </div>
    </nav>
  );
} 