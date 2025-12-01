import React, { useEffect, useState } from 'react';
import { HistoryItem } from '../types';
import { historyService } from '../services/historyService';

interface HistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
  currentSessionId: string | null;
}

const HistorySheet: React.FC<HistorySheetProps> = ({ isOpen, onClose, onSelect, currentSessionId }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history when sheet opens
  useEffect(() => {
    if (isOpen) {
      setHistory(historyService.getAll());
    }
  }, [isOpen]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    historyService.delete(id);
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getTitle = (text: string) => {
    // Try to grab the first line or first few words
    const firstLine = text.split('\n')[0].trim();
    return firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine || 'Untitled Analysis';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sheet Content */}
      <div className={`fixed right-0 top-0 z-50 h-full w-full sm:w-[400px] border-l border-border bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Analysis History</h2>
            <button 
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              <span className="sr-only">Close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <p className="text-sm text-muted-foreground">No history yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => { onSelect(item); onClose(); }}
                    className={`group relative rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors ${currentSessionId === item.id ? 'bg-accent border-primary/50' : 'border-border'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                       <div className="space-y-1 min-w-0">
                          <h4 className="text-sm font-medium leading-none truncate pr-4 text-foreground">
                            {getTitle(item.text)}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTime(item.timestamp)}</span>
                            {item.result.tier1.hasSignals && (
                              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-destructive"></span>
                            )}
                          </div>
                       </div>
                       <button
                        onClick={(e) => handleDelete(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1"
                        title="Delete"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HistorySheet;
