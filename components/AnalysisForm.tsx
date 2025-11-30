import React, { useState, useEffect, useRef } from 'react';

interface AnalysisFormProps {
  onAnalyze: (text: string) => void;
  isLoading: boolean;
  hasResult: boolean;
  onReset: () => void;
  initialText?: string;
}

const AnalysisForm: React.FC<AnalysisFormProps> = ({ onAnalyze, isLoading, hasResult, onReset, initialText }) => {
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Ref to track text area for auto-focus if needed
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load initial text if provided (restoring history)
  useEffect(() => {
    if (initialText) {
      setText(initialText);
      setIsExpanded(false); // Auto collapse when loading history
    }
  }, [initialText]);

  // Automatically collapse when a result arrives
  useEffect(() => {
    if (hasResult && !initialText) {
      setIsExpanded(false);
    }
  }, [hasResult, initialText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAnalyze(text);
    }
  };

  const handlePasteDemo = () => {
    setText(`TECH GIANT CORP (TGC) - Q3 2024 UPDATE
    
October 15, 2024: TGC announces the sudden departure of CFO Sarah Jenkins, citing personal reasons. The search for a successor begins immediately as the company navigates a challenging fiscal year. Interim CFO Mark Stone will step in temporarily.

September 10, 2024: TGC secures $500M in Series E funding led by Sequoia to accelerate their AI infrastructure. 

August 2024: Rumors circulate about activist investor Elliott Management taking a stake in TGC, pushing for a breakup of its cloud division.

June 2024: The company launched "Project Horizon," a massive digital transformation initiative aiming to overhaul their legacy supply chain systems by 2025.

May 2024: TGC is reportedly looking for a new "Head of Global Sustainability" to manage impending ESG compliance requirements in the EU.`);
  };

  // Calculate word count for the summary view
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const previewText = text.length > 60 ? text.substring(0, 60) + "..." : text;

  // Handler for New Analysis button
  const handleNewAnalysis = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding the form
    setText(''); // Clear text
    onReset(); // Trigger parent reset logic
    setIsExpanded(true); // Expand for new input
    // Small timeout to allow render before focusing
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Render Compact View (Summary Bar)
  if (!isExpanded && hasResult) {
    return (
      <div 
        className="group rounded-xl border border-border bg-card text-card-foreground shadow-sm w-full max-w-4xl mx-auto overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer animate-in fade-in slide-in-from-top-2"
        onClick={() => setIsExpanded(true)}
      >
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
             <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
             </div>
             <div className="flex flex-col min-w-0">
               <span className="text-sm font-medium truncate text-foreground/80 group-hover:text-primary transition-colors">
                 Input Content ({wordCount} words)
               </span>
               <span className="text-xs text-muted-foreground truncate font-mono opacity-70">
                 {previewText}
               </span>
             </div>
          </div>
          
          {/* Action Buttons Area */}
          <div className="flex items-center gap-2 shrink-0">
             {/* New Analysis Button (Ghost) */}
             <button
               type="button"
               onClick={handleNewAnalysis}
               className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-9 px-3 text-muted-foreground"
               title="Start new analysis"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0 sm:mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
               <span className="hidden sm:inline">New Analysis</span>
             </button>

             {/* Refine Button (Standard) */}
             <button 
               type="button"
               className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
             >
               Refine Analysis
             </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Full View (Workspace)
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm w-full max-w-4xl mx-auto overflow-hidden transition-all duration-300">
      {/* Indeterminate Loading Bar */}
      {isLoading && (
        <div className="h-1 w-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary w-1/3 animate-progress-indeterminate rounded-full"></div>
        </div>
      )}
      
      <div className="flex flex-col space-y-1.5 p-4 sm:p-6 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold leading-none tracking-tight">Lead Intelligence Analysis</h3>
          {/* Show cancel button if we have a result (allowing user to collapse back) */}
          {hasResult && !isLoading && (
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Cancel
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 leading-normal">
          Paste raw merged content (news, releases, LinkedIn) to extract executive search signals.
        </p>
      </div>
      
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <textarea
              ref={textareaRef}
              id="content"
              className="flex min-h-[180px] sm:min-h-[320px] max-h-[60vh] w-full rounded-lg border border-input bg-transparent px-4 py-3 text-sm sm:text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 resize-y font-mono leading-relaxed transition-colors"
              placeholder="Paste merged web content here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isLoading}
              required
              autoFocus={isExpanded && !!text} 
            />
          </div>
          
          {/* Responsive Action Bar */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
            <button 
              type="button" 
              onClick={handlePasteDemo}
              disabled={isLoading || text.length > 0}
              className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 py-2 sm:py-0 self-center sm:self-auto hover:underline underline-offset-4"
            >
              Paste example content
            </button>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { setText(''); onReset(); }}
                disabled={!text || isLoading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 sm:h-10 px-4 w-full sm:w-auto"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isLoading || !text.trim()}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 sm:h-10 px-8 w-full sm:w-auto shadow-sm"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    Processing...
                  </span>
                ) : (
                  hasResult ? 'Update Analysis' : 'Generate Report'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnalysisForm;