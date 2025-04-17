"use client";

import { createContext, useContext, useReducer } from "react";

export type EntryStatus = "active" | "won" | "lost";

export interface BetEntry {
  id: string;
  date: string;
  status: EntryStatus;
  entry: number;
  prize: number;
  currency: 'cash' | 'coins';
  selections: {
    id: string;
    marketQuestion: string;
    outcomeName: string;
    odds: string;
    imageUrl?: string;
  }[];
}

interface EntriesState {
  entries: BetEntry[];
}

type EntriesAction = {
  type: "ADD_ENTRY";
  payload: BetEntry;
};

const initialState: EntriesState = {
  entries: []
};

function entriesReducer(state: EntriesState, action: EntriesAction): EntriesState {
  switch (action.type) {
    case "ADD_ENTRY":
      return {
        ...state,
        entries: [action.payload, ...state.entries]
      };
    default:
      return state;
  }
}

const EntriesContext = createContext<{
  state: EntriesState;
  addEntry: (entry: Omit<BetEntry, "id" | "date" | "status">) => void;
} | null>(null);

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(entriesReducer, initialState);

  const addEntry = (entry: Omit<BetEntry, "id" | "date" | "status">) => {
    const newEntry: BetEntry = {
      ...entry,
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      status: "active"
    };

    dispatch({ type: "ADD_ENTRY", payload: newEntry });
  };

  return (
    <EntriesContext.Provider value={{ state, addEntry }}>
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  const context = useContext(EntriesContext);
  if (!context) {
    throw new Error("useEntries must be used within an EntriesProvider");
  }
  return context;
} 