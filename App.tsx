import React, { useState, useEffect, useRef } from 'react';
import AnalysisForm from './components/AnalysisForm';
import ReportCard from './components/ReportCard';
import HistorySheet from './components/HistorySheet';
import { AnalysisResult, AnalysisStatus, HistoryItem } from './types';
import { analyzeContent } from './services/geminiService';
import { historyService } from './services/historyService';

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // History & Session State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialText, setInitialText] = useState<string>(''); // For restoring text

  // Ref for scrolling to results
  const resultRef = useRef<HTMLDivElement>(null);

  // Sync theme with DOM on mount
  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  // Auto-scroll to results when completed
  useEffect(() => {
    if (status === AnalysisStatus.COMPLETED && resultRef.current) {
      // Small timeout to allow the DOM to render the ReportCard
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [status]);

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setTheme('light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setTheme('dark');
    }
  };

  const handleAnalyze = async (text: string) => {
    setStatus(AnalysisStatus.ANALYZING);
    setError(null);
    // Don't clear result immediately to prevent UI flicker in refine mode
    
    try {
      const data = await analyzeContent(text);
      setResult(data);
      setStatus(AnalysisStatus.COMPLETED);

      // --- History & Session Logic ---
      const timestamp = Date.now();
      let currentId = sessionId;
      
      if (!currentId) {
        // New Session
        currentId = crypto.randomUUID();
        setSessionId(currentId);
      }

      // Save/Update History
      const historyItem: HistoryItem = {
        id: currentId,
        timestamp,
        text,
        result: data
      };
      historyService.save(historyItem);

    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred during analysis.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleReset = () => {
    setStatus(AnalysisStatus.IDLE);
    setResult(null);
    setError(null);
    setSessionId(null); // Clear session to allow new ID generation on next run
    setInitialText('');
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setResult(item.result);
    setInitialText(item.text);
    setSessionId(item.id);
    setStatus(AnalysisStatus.COMPLETED);
    setError(null);
  };

  // Safe Debug Info Extraction
  let keyStatus = "Checking...";
  let envMode = "Unknown";
  
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const hasKey = !!import.meta.env.VITE_API_KEY;
      keyStatus = hasKey ? "Loaded ✅" : "Missing ❌";
      // @ts-ignore
      envMode = import.meta.env.MODE === 'production' ? 'PROD' : 'DEV';
    } else {
       // Fallback for non-Vite envs or when import.meta.env is undefined
       // @ts-ignore
       if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
          keyStatus = "Loaded ✅ (Proc)";
          envMode = "Process";
       } else {
          keyStatus = "Missing ❌";
          envMode = "Legacy";
       }
    }
  } catch (e) {
    keyStatus = "Error";
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-colors duration-300">
      
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-4xl mx-auto h-14 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              EI
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground/90 hover:text-foreground transition-colors cursor-default">
              ExecSearch Intel
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
             {/* History Button */}
             <button 
                onClick={() => setIsHistoryOpen(true)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-9 w-9 text-muted-foreground"
                aria-label="View History"
                title="History"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </button>

             {/* Theme Toggle */}
             <button 
                onClick={toggleTheme}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-9 w-9"
                aria-label="Toggle theme"
              >
                 {theme === 'dark' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
                 ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                 )}
              </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-12">
        
        {/* Hero Header - Auto collapse on mobile when reporting to save space */}
        {(status === AnalysisStatus.IDLE || status === AnalysisStatus.ANALYZING) && (
          <div className="space-y-3 text-center max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-500 px-2">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Intelligence for Executive Search
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed max-w-prose mx-auto">
              Synthesize unstructured web data into executive-level hiring signals and actionable pitch angles.
            </p>
          </div>
        )}

        {/* Workspace: Input & Form - Collapsible Logic */}
        <AnalysisForm 
          onAnalyze={handleAnalyze} 
          isLoading={status === AnalysisStatus.ANALYZING} 
          hasResult={!!result}
          onReset={handleReset}
          initialText={initialText}
        />

        {/* Skeleton Loading State */}
        {status === AnalysisStatus.ANALYZING && (
           <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-pulse px-1">
              <div className="h-40 sm:h-48 w-full bg-muted/40 rounded-xl"></div>
              <div className="h-40 sm:h-48 w-full bg-muted/40 rounded-xl"></div>
           </div>
        )}

        {/* Error State */}
        {status === AnalysisStatus.ERROR && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive shadow-sm flex items-start gap-3 max-w-4xl mx-auto">
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Analysis Failed</p>
              <p className="opacity-90 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Report View */}
        {result && (
          <div ref={resultRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 scroll-mt-20">
             <ReportCard result={result} />
             
             {/* Simple reset for bottom of page mobile users who missed the top refine button */}
             <div className="pt-8 text-center sm:hidden">
                <button 
                  onClick={handleReset}
                  className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10"
                >
                  Start New Analysis
                </button>
             </div>
          </div>
        )}

        {/* History Side Sheet */}
        <HistorySheet 
           isOpen={isHistoryOpen} 
           onClose={() => setIsHistoryOpen(false)} 
           onSelect={handleLoadHistory}
           currentSessionId={sessionId}
        />

      </main>
      
      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-6 mt-auto">
        <div className="container max-w-4xl mx-auto text-center px-4">
           <p className="text-xs text-muted-foreground">
             Executive Search Intelligence Tool &copy; 2025 MRS.ai. All rights reserved.
           </p>
           {/* Debug info for Vercel troubleshooting */}
           <p className="text-[10px] text-muted-foreground/30 font-mono mt-2 uppercase tracking-wider">
             Env: {envMode} | API Key Check: {keyStatus}
           </p>
        </div>
      </footer>
    </div>
  );
};

export default App;