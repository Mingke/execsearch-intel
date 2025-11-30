import { supabase } from './supabaseClient';
import { AnalysisResult } from '../types';

// Ping the Edge Function to check if it's reachable
export const checkSystemHealth = async (): Promise<{ ok: boolean; message: string }> => {
  try {
    // UPDATED: Using the actual deployed slug 'smooth-worker'
    const { data, error } = await supabase.functions.invoke('smooth-worker', {
      method: 'GET', // Health check endpoint
    });

    if (error) throw error;
    return { ok: true, message: `System Online (Model: ${data.model || 'Unknown'})` };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Connection Failed' };
  }
};

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
  // UPDATED: Using the actual deployed slug 'smooth-worker'
  const { data, error } = await supabase.functions.invoke('smooth-worker', {
    body: { text }
  });

  console.log("Edge Function Response:", { data, error });

  // 3. Handle Errors
  if (error) {
    console.error("Edge Function Error Details:", error);
    
    let errorMessage = error.message || "Failed to analyze content.";
    
    // Map generic network errors to something helpful
    if (errorMessage.includes("Failed to send a request") || errorMessage.includes("fetch")) {
       errorMessage = "Unable to connect to the cloud function. This is likely a CORS or Deployment issue. Please run Diagnostics in Admin Dashboard.";
    }

    try {
        // Try parsing JSON error from backend
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