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

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}