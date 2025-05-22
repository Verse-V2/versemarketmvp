"use client";

import { useAuth } from "@/lib/auth-context";
import { useUserBalance } from "@/lib/user-balance-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import Link from "next/link";
import Image from "next/image";
import {
  UserIcon,
  ArrowRightOnRectangleIcon,
  TrophyIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { firebaseService } from "@/lib/firebase-service";

export default function AccountPage() {
  const user = useAuth();
  const { coinBalance, cashBalance, isLoading: isBalanceLoading } = useUserBalance();
  const [signingOut, setSigningOut] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userNameLoading, setUserNameLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    setUserNameLoading(true);
    firebaseService.getUserData(user.uid).then((data) => {
      setUserName(data?.userName || null);
      setUserNameLoading(false);
    });
  }, [user?.uid]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setSigningOut(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container max-w-md mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Please sign in to view your account</p>
          </div>
        </main>
      </div>
    );
  }

  // Format last login (if available)
  let lastLogin = null;
  if (user.metadata?.lastSignInTime) {
    const date = new Date(user.metadata.lastSignInTime);
    lastLogin = date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  }

  return (
    <div className="min-h-screen bg-black text-white px-4">
      <main className="max-w-md mx-auto pt-4 pb-24">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="h-[45px] w-[45px] rounded-full bg-[#232323] flex items-center justify-center border-4 border-[#18181B] shadow-md flex-shrink-0">
            {/* Avatar placeholder */}
            <UserIcon className="h-7 w-7 text-[#A3A3A3]" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="font-bold leading-tight" style={{ fontSize: 21 }}>
              {userNameLoading ? "..." : userName || user.displayName || user.email || "User"}
            </h1>
            {lastLogin && (
              <p className="text-xs mt-1">
                <span className="text-white">Last Login:</span>{' '}
                <span className="text-gray-400">{lastLogin}</span>
              </p>
            )}
          </div>
        </div>

        {/* Refer Friends Card */}
        <div className="relative bg-[#18181B] rounded-2xl mb-4 flex items-center gap-4 shadow-lg overflow-hidden min-h-[135px] h-[135px] px-5 py-0">
          {/* Large transparent background logo */}
          <Image src="/VerseAppIconTrans.png" alt="App Icon BG" width={190} height={190} priority className="object-cover opacity-100 drop-shadow-2xl pointer-events-none select-none absolute right-0 top-1/2 -translate-y-1/2 z-0" />
          <div className="flex-1 z-10">
            <h2 className="text-lg font-semibold mb-1">Refer Friends</h2>
            <p className="text-sm text-gray-400 mb-3">Share the fun! Invite friends and claim your rewards!</p>
            <Button className="bg-black border border-[#0BC700] text-[#0BC700] rounded-full px-6 font-semibold hover:bg-[#0BC700]/10 transition-all h-[34px]" size="lg">
              Invite Friends
            </Button>
          </div>
          <div className="relative flex items-center justify-center w-[90px] h-[90px] z-10">
            <span className="relative z-10">
              <Image src="/invitelogo.png" alt="Invite Friends" width={90} height={90} className="object-contain" />
            </span>
          </div>
        </div>

        {/* Verse Balance Title */}
        <h2 className="text-lg font-semibold mb-2">Verse Balance</h2>

        {/* Verse Balance Card */}
        <div className="bg-[#18181B] rounded-2xl p-5 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image src="/verse-coin.png" alt="Verse Coin" width={32} height={32} className="object-contain" />
              <div>
                <div className="text-xs text-white font-bold">Verse Coins</div>
                <div className="text-xl font-bold text-[#E9ED05]">{isBalanceLoading ? "-" : coinBalance.toLocaleString()}</div>
              </div>
            </div>
            <div className="w-px h-8 bg-[#232323] mx-2" />
            <div className="flex items-center gap-2">
              <Image src="/cash-icon.png" alt="Verse Cash" width={32} height={32} className="object-contain" />
              <div>
                <div className="text-xs text-white font-bold">Verse Cash</div>
                <div className="text-xl font-bold text-[#0BC700]">{isBalanceLoading ? "-" : cashBalance.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <Button className="w-full bg-[#0BC700] hover:bg-[#0AB100] text-black rounded-full font-semibold shadow-md transition-all" style={{ height: 47, fontSize: 16 }}>
            Redeem Cash
          </Button>
        </div>

        {/* Menu List */}
        <nav className="bg-[#18181B] rounded-2xl divide-y divide-[#232323] shadow-lg mb-6">
          <MenuItem href="/my-entries" icon={<TrophyIcon className="h-6 w-6" />} label="My Leagues" />
          <MenuItem href="#" icon={<ClipboardDocumentListIcon className="h-6 w-6" />} label="Transaction History" />
          <MenuItem href="#" icon={<Cog6ToothIcon className="h-6 w-6" />} label="Account Settings" />
          <MenuItem href="#" icon={<QuestionMarkCircleIcon className="h-6 w-6" />} label="Support" />
          <MenuItem href="#" icon={<DocumentTextIcon className="h-6 w-6" />} label="Legal Documents" />
          <MenuItem href="#" icon={<BookOpenIcon className="h-6 w-6" />} label="Sweepstakes Rules" />
          <SignOutMenuItem onClick={handleSignOut} disabled={signingOut} />
        </nav>
      </main>
    </div>
  );
}

function MenuItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center px-5 py-4 gap-4 hover:bg-[#232323] transition-all">
      <span className="text-white">{icon}</span>
      <span className="flex-1 text-base font-medium text-white">{label}</span>
      <ChevronRightIcon className="h-5 w-5 text-white opacity-40" />
    </Link>
  );
}

function SignOutMenuItem({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center w-full px-5 py-4 gap-4 hover:bg-[#232323] transition-all focus:outline-none"
    >
      <span className="text-red-500"><ArrowRightOnRectangleIcon className="h-6 w-6" /></span>
      <span className="flex-1 text-base font-medium text-red-500 text-left">Sign out</span>
    </button>
  );
} 