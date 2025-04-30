"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Bet {
  marketId: string;
  eventId: string;
  marketQuestion: string;
  outcomeId: string;
  outcomeName: string;
  odds: string;
  probability: number;
  imageUrl?: string;
}

interface BetSlipContextType {
  bets: Bet[];
  addBet: (bet: Bet) => void;
  removeBet: (outcomeId: string) => void;
  clearBets: () => void;
  isBetInSlip: (outcomeId: string) => boolean;
  hasConflictingBets: () => boolean;
  getConflictingMarkets: () => { id: string; question: string }[];
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [bets, setBets] = useState<Bet[]>([]);

  const addBet = useCallback((bet: Bet) => {
    console.log('Adding bet to slip:', {
      marketId: bet.marketId,
      eventId: bet.eventId,
      marketQuestion: bet.marketQuestion,
      outcomeName: bet.outcomeName,
      odds: bet.odds
    });
    setBets(prev => {
      // Check if bet already exists
      const exists = prev.some(b => b.outcomeId === bet.outcomeId);
      if (exists) return prev;
      return [...prev, bet];
    });
  }, []);

  const removeBet = useCallback((outcomeId: string) => {
    setBets(prev => prev.filter(bet => bet.outcomeId !== outcomeId));
  }, []);

  const clearBets = useCallback(() => {
    setBets([]);
  }, []);

  const isBetInSlip = useCallback((outcomeId: string) => {
    return bets.some(bet => bet.outcomeId === outcomeId);
  }, [bets]);

  const hasConflictingBets = useCallback(() => {
    const marketIds = bets.map(bet => bet.marketId);
    return marketIds.length !== new Set(marketIds).size;
  }, [bets]);

  const getConflictingMarkets = useCallback(() => {
    const marketCounts = new Map<string, number>();
    const marketInfo = new Map<string, string>();
    
    bets.forEach(bet => {
      marketCounts.set(bet.marketId, (marketCounts.get(bet.marketId) || 0) + 1);
      marketInfo.set(bet.marketId, bet.marketQuestion);
    });

    return Array.from(marketCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([id]) => ({
        id,
        question: marketInfo.get(id) || ''
      }));
  }, [bets]);

  return (
    <BetSlipContext.Provider value={{ 
      bets, 
      addBet, 
      removeBet, 
      clearBets, 
      isBetInSlip,
      hasConflictingBets,
      getConflictingMarkets
    }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (context === undefined) {
    throw new Error('useBetSlip must be used within a BetSlipProvider');
  }
  return context;
} 