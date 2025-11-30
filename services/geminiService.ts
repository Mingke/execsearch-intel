
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
    
    // Attempt to parse the error message if it's a JSON string
    // The supbase-js client sometimes wraps the response body in 'error.message' if status is not 2xx
    // It can look like: "{\"error\": \"Quota Exceeded\"}" or just "Quota Exceeded"
    let errorMessage = error.message || "Failed to analyze content.";
    
    try {
        // Try parsing the error.message string as JSON
        if (typeof errorMessage === 'string' && (errorMessage.startsWith('{') || errorMessage.startsWith('"'))) {
            const parsed = JSON.parse(errorMessage);
            if (parsed.error) {
                errorMessage = parsed.error;
            } else if (typeof parsed === 'string') {
                errorMessage = parsed;
            }
        }
    } catch (e) {
        // parsing failed, use original message
    }

    // Explicit check for Quota (402)
    if (error.context && (error.context as any).status === 402) {
       errorMessage = "Quota Exceeded. You have reached your analysis limit. Please contact the administrator.";
    }

    throw new Error(errorMessage);
  }

  // 4. Return Data
  return data as AnalysisResult;
};
