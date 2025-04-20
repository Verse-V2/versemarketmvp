'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Trophy, Plus } from "lucide-react";

export default function LeagueSyncHome() {
  const router = useRouter();
  const user = useAuth();
  const [activeTab, setActiveTab] = useState('Matchups');

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (user === null) {
      router.push('/auth');
    }
  }, [user, router]);

  // Show loading state while checking auth
  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const tabs = [
    { name: 'Matchups', label: 'Matchups (Week 11)' },
    { name: 'Roster', label: 'Roster' },
    { name: 'Futures', label: 'Futures' },
    { name: 'Stats', label: 'Stats' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Add new league button */}
        <div className="border border-dashed border-gray-600 rounded-lg p-6 flex items-center justify-center mb-8 cursor-pointer hover:border-green-500 transition-colors">
          <button className="flex items-center gap-2 text-green-500 font-medium">
            <Plus className="h-5 w-5" />
            Add new league
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800 flex overflow-x-auto mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.name
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => setActiveTab(tab.name)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Empty state content */}
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-gray-600 mb-6">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M40 20C43.3137 20 46 17.3137 46 14C46 10.6863 43.3137 8 40 8C36.6863 8 34 10.6863 34 14C34 17.3137 36.6863 20 40 20Z" stroke="#555" strokeWidth="2"/>
              <path d="M40 33V20" stroke="#555" strokeWidth="2"/>
              <path d="M25 47H55" stroke="#555" strokeWidth="2"/>
              <path d="M30 47V60" stroke="#555" strokeWidth="2"/>
              <path d="M50 47V60" stroke="#555" strokeWidth="2"/>
              <path d="M20 60H40" stroke="#555" strokeWidth="2"/>
              <path d="M40 60H60" stroke="#555" strokeWidth="2"/>
              <path d="M25 60V72" stroke="#555" strokeWidth="2"/>
              <path d="M35 60V72" stroke="#555" strokeWidth="2"/>
              <path d="M45 60V72" stroke="#555" strokeWidth="2"/>
              <path d="M55 60V72" stroke="#555" strokeWidth="2"/>
            </svg>
          </div>
          <p className="text-gray-500 text-lg">
            The matchups will appear here<br />when you add a new league
          </p>
        </div>
      </main>
    </div>
  );
} 