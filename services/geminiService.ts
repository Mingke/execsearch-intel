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
    let errorMessage = error.message || "Failed to analyze content.";
    
    // Check for standard Supabase Function error wrapper
    if (error.context && (error.context as any).status === 402) {
      throw new Error("Quota Exceeded. You have reached your analysis limit. Please contact the administrator.");
    }

    try {
        // If the function returned a JSON error object (like { error: "msg" }), parse it
        // The supbase-js client sometimes wraps the response body in 'error.message' if status is not 2xx
        if (typeof errorMessage === 'string' && errorMessage.trim().startsWith('{')) {
            const parsed = JSON.parse(errorMessage);
            if (parsed.error) {
                errorMessage = parsed.error;
            }
        }
    } catch (e) {
        // use raw message if parse fails
    }

    throw new Error(errorMessage);
  }

  // 4. Return Data
  return data as AnalysisResult;
};