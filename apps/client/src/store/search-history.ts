import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
}

interface SearchHistoryStore {
  history: SearchHistoryItem[];
  addToHistory: (query: string) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  getRecentHistory: (limit?: number) => SearchHistoryItem[];
}

export const useSearchHistory = create<SearchHistoryStore>()(
  persist(
    (set, get) => ({
      history: [],

      addToHistory: (query: string) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return;

        set((state) => {
          // Remove duplicate if exists
          const filtered = state.history.filter(
            (item) => item.query !== trimmedQuery
          );

          // Add to beginning and limit to 20 items
          const updated = [
            {
              id: Date.now().toString(),
              query: trimmedQuery,
              timestamp: Date.now(),
            },
            ...filtered,
          ].slice(0, 20);

          return { history: updated };
        });
      },

      removeFromHistory: (id: string) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }));
      },

      clearHistory: () => {
        set({ history: [] });
      },

      getRecentHistory: (limit = 5) => {
        return get().history.slice(0, limit);
      },
    }),
    {
      name: "search-history-storage",
    }
  )
);
