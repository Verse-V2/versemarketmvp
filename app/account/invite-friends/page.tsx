"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { ChevronDown } from "lucide-react";
import { Share } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function InviteFriendsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Replace with your actual invite link logic
  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/invite?ref=YOURCODE` : '';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Verse!',
          text: 'Get $25 in Verse Cash when you join Verse using my invite link!',
          url: inviteLink,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(inviteLink);
        toast.success('Invite link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy invite link.');
      }
    } else {
      toast('Sharing not supported on this device.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-4">
      <header className="flex items-center justify-between pt-4 pb-2 max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white hover:text-[#0BC700] transition-colors"
        >
          <ChevronLeftIcon className="h-6 w-6" />
          <span className="font-medium">Back</span>
        </button>
        <span className="text-lg font-semibold">Refer A Friend</span>
        <span className="w-12" /> {/* Spacer for symmetry */}
      </header>
      <main className="max-w-md mx-auto pb-24">
        {/* Bonus Offer Card */}
        <div className="relative bg-[#18181B] rounded-2xl flex items-center gap-4 shadow-lg overflow-hidden min-h-[135px] h-[135px] px-5 py-0 mb-6">
          <Image src="/VerseAppIconTrans.png" alt="App Icon BG" width={190} height={190} priority className="object-cover opacity-100 drop-shadow-2xl pointer-events-none select-none absolute right-0 top-1/2 -translate-y-1/2 z-0" />
          <div className="flex-1 z-10">
            <h2 className="font-bold mb-1 text-xl sm:text-2xl md:text-3xl">Get $25 in Verse Cash</h2>
            <p className="text-sm text-gray-400 mb-2"><Link href="#" className="underline text-[#0BC700]">Terms and conditions apply.</Link></p>
            <Button className="bg-[#0BC700] text-black rounded-full px-6 font-semibold hover:bg-[#0AB100] transition-all h-[38px] w-full max-w-xs" onClick={handleShare}>
              Share Invite
              <Share className="h-5 w-5 ml-2" />
            </Button>
          </div>
          <div className="relative flex items-center justify-center w-[90px] h-[90px] z-10">
            <span className="relative z-10">
              <Image src="/invitelogo.png" alt="Invite Friends" width={90} height={90} className="object-contain" />
            </span>
          </div>
        </div>

        {/* Referrals Dropdown */}
        <div className="bg-[#18181B] rounded-2xl px-5 py-4 mb-6 shadow-lg">
          <button
            className="flex items-center justify-between w-full focus:outline-none"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <div className="text-left">
              <div className="text-base font-semibold">Your Referrals</div>
              <div className="text-sm text-gray-400">See progress of friends you've referred</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#0BC700]">0</span>
              <ChevronDown className={`h-5 w-5 text-white transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {open && (
            <div className="flex flex-col items-center justify-center py-10">
              <Image src="/invitelogo.png" alt="No referrals" width={80} height={80} className="mb-4 opacity-40" />
              <div className="text-lg font-bold text-center mb-2 text-white">No referrals yet</div>
              <div className="text-center text-gray-400 text-base max-w-xs">
                Any friends who join Verse through your invite link will appear here.<br /><br />
                <span className="font-medium text-white">Start referring friends to earn $$$!</span>
              </div>
            </div>
          )}
        </div>

        {/* How it works */}
        <section className="bg-[#18181B] rounded-2xl px-5 py-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">How it works</h3>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="bg-[#232323] rounded-full w-10 h-10 flex items-center justify-center">
                <Image src="/invitelogo.png" alt="Invite" width={28} height={28} />
              </div>
              <div>
                <div className="font-medium">Your friend joins</div>
                <div className="text-sm text-gray-400">Using your unique invite link</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[#232323] rounded-full w-10 h-10 flex items-center justify-center">
              <Image src="/verse-coin.png" alt="Bonus Bets" width={28} height={28} />
              </div>
              <div>
                <div className="font-medium">They Purchase a Coin Package</div>
                <div className="text-sm text-gray-400">Must be a single purchase of $10+</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[#232323] rounded-full w-10 h-10 flex items-center justify-center">
                <Image src="/cash-icon.png" alt="Wager" width={28} height={28} />
              </div>
              <div>
                <div className="font-medium text-[#0BC700]">You get $25 in Verse Cash</div>
                <div className="text-sm text-gray-400">To play on Verse!</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 