"use client";

import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { UserIcon } from "@heroicons/react/24/outline";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AccountPage() {
  const user = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-2xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Please sign in to view your account</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.email}</h1>
              <p className="text-sm text-muted-foreground">Account Settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h2 className="font-medium mb-2">Email</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium">Theme</h2>
                  <p className="text-sm text-muted-foreground">Customize your app appearance</p>
                </div>
                <ThemeToggle />
              </div>
            </div>

            <Button
              variant="destructive"
              className="w-full"
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
} 