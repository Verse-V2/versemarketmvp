"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';

interface UserBalanceContextType {
  coinBalance: number;
  cashBalance: number;
  setCoinBalance: (balance: number) => void;
  setCashBalance: (balance: number) => void;
  isLoading: boolean;
}

const UserBalanceContext = createContext<UserBalanceContextType>({
  coinBalance: 0,
  cashBalance: 0,
  setCoinBalance: () => {},
  setCashBalance: () => {},
  isLoading: true,
});

export function UserBalanceProvider({ children }: { children: React.ReactNode }) {
  const [coinBalance, setCoinBalance] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuth();
  const db = getFirestore();

  useEffect(() => {
    if (!user) {
      setCoinBalance(0);
      setCashBalance(0);
      setIsLoading(false);
      return;
    }

    // Subscribe to the user's balance document
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setCoinBalance(data.coinBalance || 0);
          setCashBalance(data.cashBalance || 0);
        } else {
          // If document doesn't exist, set default values
          setCoinBalance(0);
          setCashBalance(0);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching user balances:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, db]);

  return (
    <UserBalanceContext.Provider 
      value={{ 
        coinBalance, 
        cashBalance, 
        setCoinBalance, 
        setCashBalance,
        isLoading
      }}
    >
      {children}
    </UserBalanceContext.Provider>
  );
}

export function useUserBalance() {
  return useContext(UserBalanceContext);
} 