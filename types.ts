
export interface AnalysisResult {
  tier1: {
    status: string;
    items: string[];
    hasSignals: boolean;
  };
  tier2: {
    status: string;
    items: string[];
    hasSignals: boolean;
  };
  insight: {
    content: string;
    hasSignals: boolean;
  };
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  text: string;
  result: AnalysisResult;
}

export interface UserProfile {
  id: string;
  email: string;
  usage_count: number;
  usage_limit: number;
  role: 'user' | 'admin';
  created_at?: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
