import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // Forces redirect back to current domain (Vercel or Localhost)
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };

  // 1. Check Configuration First
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-4">
        <div className="w-full max-w-lg rounded-xl border border-destructive/50 bg-destructive/10 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-destructive/20 p-3 text-destructive">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.42 16.18a2 2 0 0 0 2.03-1.11l1.54-3.56a2 2 0 0 0-1.47-2.7C20.48 8.65 19.16 8.5 18 8.5c-2.03 0-3.37.56-4.96 1.45L9.58 12 5.09 7.6a2 2 0 0 0-3.03.24L1.8 8.1a2 2 0 0 0 .24 3.03L6 15l-1.93 4.45a2 2 0 0 0 1.11 2.03l3.56 1.54a2 2 0 0 0 2.7-1.47L12 18l-1.45-3.04"/><line x1="12" y1="12" x2="19.1" y2="4.9"/><path d="M19.1 4.9C19.83 4.18 21 5.35 21 5.35"/></svg>
            </div>
            <h2 className="text-xl font-bold text-destructive">Configuration Required</h2>
            <p className="text-sm text-foreground/80">
              The application is missing its connection to Supabase. You cannot log in until the Environment Variables are set.
            </p>
            <div className="text-left bg-background/50 p-4 rounded-md w-full font-mono text-xs border border-border/50 space-y-2">
              <p className="font-bold">Required Vercel Variables:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="bg-muted px-1 rounded">VITE_SUPABASE_URL</code></li>
                <li><code className="bg-muted px-1 rounded">VITE_SUPABASE_ANON_KEY</code></li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Please check the README.md or Vercel Project Settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Render Login Form
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20">
            EI
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-muted-foreground text-sm">
            Sign in to access ExecSearch Intel
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 sm:p-8">
          <div className="space-y-6">
            
            <div className="space-y-2 text-center">
               <p className="text-sm text-muted-foreground">
                 Professional workspace for Executive Search analysis.
               </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="relative inline-flex w-full items-center justify-center gap-3 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {loading ? 'Connecting...' : 'Continue with Google'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Secure Access
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-center text-xs text-muted-foreground px-8">
          By clicking continue, you agree to the internal usage policy for the Intelligence Tool.
        </p>
      </div>
    </div>
  );
};

export default Login;