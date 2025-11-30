import { supabase } from './supabaseClient';
import { AnalysisResult } from '../types';

export const analyzeContent = async (text: string): Promise<AnalysisResult> => {
  console.log("Starting analysis...");

  // 1. Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error("No active session found.");
    throw new Error("Authentication required. Please login to use this tool.");
  }

  console.log("User authenticated, invoking Edge Function...");

  // 2. Invoke the Supabase Edge Function
  // The backend now handles: Quota check, Gemini API call, and Usage increment.
  const { data, error } = await supabase.functions.invoke('analyze-content', {
    body: { text }
  });

  console.log("Edge Function Response:", { data, error });

  // 3. Handle Errors
  if (error) {
    console.error("Edge Function Error Details:", error);
    
    // Convert generic function errors into user-friendly messages
    if (error.context && (error.context as any).status === 402) {
      throw new Error("Quota Exceeded. You have reached your analysis limit. Please contact the administrator.");
    }
    
    // Handle custom errors returned by our function
    try {
      // Sometimes the error body is a JSON string
      const errBody = typeof error.message === 'string' && error.message.startsWith('{') 
        ? JSON.parse(error.message) 
        : error;
        
      if (errBody.error) throw new Error(errBody.error);
    } catch (e) {
      // If parsing fails, throw the raw message or a generic one
    }

    throw new Error(error.message || "Failed to analyze content. Please try again.");
  }

  // 4. Return Data
  return data as AnalysisResult;
};