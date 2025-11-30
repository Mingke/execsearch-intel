
import React, { useState, useEffect, useRef } from 'react';
import AnalysisForm from './components/AnalysisForm';
import ReportCard from './components/ReportCard';
import HistorySheet from './components/HistorySheet';
import Login from './components/Auth/Login'; // Import Login
import AdminDashboard from './components/AdminDashboard'; // Import Dashboard
import { AnalysisResult, AnalysisStatus, HistoryItem } from './types';
import { analyzeContent } from './services/geminiService';
import { historyService } from './services/historyService';
import { supabase } from './services/supabaseClient'; // Import Supabase
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user'); // New role state
  const [userCredits, setUserCredits] = useState<{count: number, limit: number} | null>(null);

  // App State
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // History & Session State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false); // Admin Dashboard State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialText, setInitialText] = useState<string>(''); 

  const resultRef = useRef<HTMLDivElement>(null);

  // --- Helper to fetch User Profile (Role & Credits) ---
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('usage_count, usage_limit, role')
        .eq('id', userId)
        .single();
      
      if (data) {
        setUserCredits({ count: data.usage_count, limit: data.usage_limit });
        setUserRole(data.role as 'user' | 'admin');
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
    }
  };

  // --- Auth Initialization ---
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Poll for credit updates when status changes (after analysis)
  useEffect(() => {
    if (session && status === AnalysisStatus.COMPLETED) {
      fetchUserProfile(session.user.id);
    }
  }, [status, session]);

  // --- Theme Logic ---
  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (status === AnalysisStatus.COMPLETED && resultRef.current) {
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

  // --- Handlers ---
  const handleAnalyze = async (text: string) => {
    setStatus(AnalysisStatus.ANALYZING);
    setError(null);
    try {
      const data = await analyzeContent(text);
      setResult(data);
      setStatus(AnalysisStatus.COMPLETED);

      const timestamp = Date.now();
      let currentId = sessionId;
      if (!currentId) {
        currentId = crypto.randomUUID();
        setSessionId(currentId);
      }
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
    setSessionId(null);
    setInitialText('');
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setResult(item.result);
    setInitialText(item.text);
    setSessionId(item.id);
    setStatus(AnalysisStatus.COMPLETED);
    setError(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Safe Debug Info
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
    }
  } catch (e) {
    keyStatus = "Error";
  }

  // --- Render Logic ---

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
           <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
           <p className="text-sm text-muted-foreground animate-pulse">Initializing Secure Session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
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
            <h1 className="text-sm font-semibold tracking-tight text-foreground/90 hover:text-foreground transition-colors cursor-default hidden sm:block">
              ExecSearch Intel
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
             {/* Admin Dashboard Trigger */}
             {userRole === 'admin' && (
                <button
                  onClick={() => setIsAdminOpen(true)}
                  className="mr-2 inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  title="Admin Dashboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                </button>
             )}

             {/* Credits Badge */}
             {userCredits && (
               <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full border border-border mr-2">
                  <div className={`h-2 w-2 rounded-full ${userCredits.count >= userCredits.limit ? 'bg-destructive' : 'bg-green-500'}`} />
                  <span className="text-xs font-medium tabular-nums">Credits: {userCredits.count} / {userCredits.limit}</span>
               </div>
             )}

             {/* User Profile / Logout */}
             <div className="flex items-center gap-3 border-r border-border pr-3 mr-1">
                <span className="text-xs text-muted-foreground hidden sm:inline-block max-w-[120px] truncate">
                   {session.user.email}
                </span>
                <button
                   onClick={handleLogout}
                   className="text-xs font-medium text-foreground/80 hover:text-destructive transition-colors"
                >
                  Logout
                </button>
             </div>

             <button 
                onClick={() => setIsHistoryOpen(true)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-9 w-9 text-muted-foreground"
                title="History"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </button>

             <button 
                onClick={toggleTheme}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-9 w-9"
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

        <AnalysisForm 
          onAnalyze={handleAnalyze} 
          isLoading={status === AnalysisStatus.ANALYZING} 
          hasResult={!!result}
          onReset={handleReset}
          initialText={initialText}
        />

        {status === AnalysisStatus.ANALYZING && (
           <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-pulse px-1">
              <div className="h-40 sm:h-48 w-full bg-muted/40 rounded-xl"></div>
              <div className="h-40 sm:h-48 w-full bg-muted/40 rounded-xl"></div>
           </div>
        )}

        {status === AnalysisStatus.ERROR && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive shadow-sm flex items-start gap-3 max-w-4xl mx-auto">
             <div className="font-bold">Error</div>
             <div>{error}</div>
          </div>
        )}

        {result && (
          <div ref={resultRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 scroll-mt-20">
             <ReportCard result={result} />
             <div className="pt-8 text-center sm:hidden">
                <button 
                  onClick={handleReset}
                  className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10"
                >
                  Start New Analysis
                </button>
             </div>
          </div>
        )}

        <HistorySheet 
           isOpen={isHistoryOpen} 
           onClose={() => setIsHistoryOpen(false)} 
           onSelect={handleLoadHistory}
           currentSessionId={sessionId}
        />

        {/* Admin Dashboard Modal */}
        {userRole === 'admin' && (
          <AdminDashboard 
            isOpen={isAdminOpen} 
            onClose={() => setIsAdminOpen(false)} 
          />
        )}

      </main>
      
      <footer className="w-full border-t border-border/40 py-6 mt-auto">
        <div className="container max-w-4xl mx-auto text-center px-4">
           <p className="text-xs text-muted-foreground">
             Executive Search Intelligence Tool &copy; 2025 MRS.ai.
           </p>
           <p className="text-[10px] text-muted-foreground/30 font-mono mt-2 uppercase tracking-wider">
             Env: {envMode} | API Key Check: {keyStatus} | Auth: Supabase
           </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
