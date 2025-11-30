import React from 'react';
import { AnalysisResult } from '../types';

interface ReportCardProps {
  result: AnalysisResult;
}

const StatusBadge = ({ status, type }: { status: string; type: 'urgent' | 'future' }) => {
  const isUrgent = type === 'urgent';
  const hasSignal = status !== 'No relevant signals identified';
  
  if (!hasSignal) {
    return (
      <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] sm:text-xs font-medium text-muted-foreground transition-colors whitespace-nowrap">
        No Signal
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-colors shadow-sm text-center whitespace-normal leading-tight
      ${isUrgent 
        ? "border-destructive/20 bg-destructive/10 text-destructive dark:text-red-400" 
        : "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400"
      }`}>
      {status}
    </span>
  );
};

// Simple helper to render bold text from markdown (e.g. **text**)
// We avoid heavy libraries like react-markdown for performance and simplicity here
const FormattedText = ({ text }: { text: string }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const ReportCard: React.FC<ReportCardProps> = ({ result }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Actionable Insight - Full Width "Hero" Card */}
      <div className="md:col-span-2 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 text-card-foreground shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6">
           <div className="flex items-center gap-2 mb-3">
             <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
             </span>
             <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Actionable Pitch Angle</h3>
           </div>
           
           <div className="relative">
              {result.insight.hasSignals ? (
                 <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-base sm:text-lg font-medium leading-relaxed text-foreground/90">
                      <FormattedText text={result.insight.content} />
                    </p>
                 </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Insufficient data to generate a specific pitch angle.
                </p>
              )}
           </div>
        </div>
      </div>

      {/* Tier 1 Section (Destructive/Red Theme) */}
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col h-full">
        <div className="flex flex-col space-y-3 p-4 sm:p-6 pb-2 sm:pb-4">
           <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2 text-sm sm:text-base">
                 <svg className="w-4 h-4 text-destructive shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l4 7h6l-5 5 2 7-6-4-6 4 2-7-5-5h6z"/></svg>
                 Immediate Triggers
              </h3>
              <StatusBadge status={result.tier1.status} type="urgent" />
           </div>
           <p className="text-xs text-muted-foreground hidden sm:block">C-Suite changes, M&A, Restructuring (Tier 1)</p>
        </div>
        
        <div className="p-4 sm:p-6 pt-2 sm:pt-0 flex-1">
          {result.tier1.hasSignals ? (
            <ul className="space-y-3 sm:space-y-4">
              {result.tier1.items.map((item, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-foreground/90 group items-start">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-destructive/70 group-hover:bg-destructive transition-colors" />
                  <span className="leading-snug"><FormattedText text={item} /></span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-full flex items-center justify-center py-4 sm:py-8 opacity-50">
              <span className="text-xs sm:text-sm italic">No urgent signals found.</span>
            </div>
          )}
        </div>
      </div>

      {/* Tier 2 Section (Primary/Blue Theme) */}
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col h-full">
        <div className="flex flex-col space-y-3 p-4 sm:p-6 pb-2 sm:pb-4">
           <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2 text-sm sm:text-base">
                 <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                 Strategic Opportunities
              </h3>
              <StatusBadge status={result.tier2.status} type="future" />
           </div>
           <p className="text-xs text-muted-foreground hidden sm:block">Expansions, Transformations, Senior Hiring (Tier 2)</p>
        </div>
        
        <div className="p-4 sm:p-6 pt-2 sm:pt-0 flex-1">
          {result.tier2.hasSignals ? (
            <ul className="space-y-3 sm:space-y-4">
              {result.tier2.items.map((item, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-foreground/90 group items-start">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500/70 group-hover:bg-blue-500 transition-colors" />
                  <span className="leading-snug"><FormattedText text={item} /></span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-full flex items-center justify-center py-4 sm:py-8 opacity-50">
              <span className="text-xs sm:text-sm italic">No strategic signals found.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ReportCard;