import { AnalysisResult, HistoryItem } from "../types";

const STORAGE_KEY = 'exec_search_history';

// Helper to check if we are in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// Type Guard to validate history items at runtime
// This prevents the app from crashing if localStorage data is corrupted or from an older schema
const isValidHistoryItem = (item: any): item is HistoryItem => {
  return (
    item &&
    typeof item.id === 'string' &&
    typeof item.timestamp === 'number' &&
    typeof item.text === 'string' &&
    item.result &&
    item.result.tier1 &&
    item.result.tier2 &&
    item.result.insight
  );
};

export const historyService = {
  getAll: (): HistoryItem[] => {
    if (!isBrowser) return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      
      if (!Array.isArray(parsed)) {
        return [];
      }

      // Filter out invalid items (Defensive Coding)
      const validItems = parsed.filter(isValidHistoryItem);
      
      // If we found invalid items, update storage to clean it up
      if (validItems.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validItems));
      }

      return validItems;
    } catch (e) {
      console.error("Failed to load history or data corrupted", e);
      // If data is critically corrupted, return empty to allow app to function
      return [];
    }
  },

  save: (item: HistoryItem): void => {
    if (!isBrowser) return;
    try {
      const history = historyService.getAll();
      // Check if item already exists (update it), otherwise add to top
      const index = history.findIndex(h => h.id === item.id);
      
      let newHistory;
      if (index >= 0) {
        // Update existing session
        newHistory = [...history];
        newHistory[index] = item;
      } else {
        // Create new session at the top
        newHistory = [item, ...history];
      }
      
      // Limit to last 50 items to prevent storage overflow
      if (newHistory.length > 50) {
        newHistory = newHistory.slice(0, 50);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  },

  delete: (id: string): void => {
    if (!isBrowser) return;
    try {
      const history = historyService.getAll();
      const newHistory = history.filter(h => h.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to delete history item", e);
    }
  }
};
