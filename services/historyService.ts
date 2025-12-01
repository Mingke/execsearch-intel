import { AnalysisResult, HistoryItem } from "../types";

const STORAGE_KEY = 'exec_search_history';

export const historyService = {
  getAll: (): HistoryItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load history", e);
      return [];
    }
  },

  save: (item: HistoryItem): void => {
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
    try {
      const history = historyService.getAll();
      const newHistory = history.filter(h => h.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to delete history item", e);
    }
  }
};