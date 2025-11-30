
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { checkSystemHealth } from '../services/geminiService'; // Import health check
import { UserProfile } from '../types';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Diagnostics State
  const [healthStatus, setHealthStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [healthMessage, setHealthMessage] = useState<string>('');

  // Fetch users when dashboard opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Note: This query relies on the RLS policy "Admins can view all profiles"
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('usage_count', { ascending: false }); // Show heavy users first

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetQuota = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ usage_count: 0 })
        .eq('id', userId);

      if (error) throw error;

      // Optimistic update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, usage_count: 0 } : u));
    } catch (err) {
      console.error("Failed to reset quota:", err);
      alert("Failed to reset quota.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleGrantVIP = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ usage_limit: 1000 })
        .eq('id', userId);

      if (error) throw error;

      // Optimistic update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, usage_limit: 1000 } : u));
    } catch (err) {
      console.error("Failed to grant VIP:", err);
      alert("Failed to grant VIP status.");
    } finally {
      setActionLoading(null);
    }
  };

  const runDiagnostics = async () => {
      setHealthStatus('checking');
      setHealthMessage('Pinging Edge Function...');
      const result = await checkSystemHealth();
      if (result.ok) {
          setHealthStatus('ok');
          setHealthMessage(result.message);
      } else {
          setHealthStatus('error');
          setHealthMessage(result.message);
      }
  };

  // Stats
  const totalUsers = users.length;
  const totalUsage = users.reduce((acc, curr) => acc + curr.usage_count, 0);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose} // Close when clicking backdrop
    >
      <div 
        className="bg-card border border-border text-card-foreground shadow-xl rounded-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking content
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Admin Dashboard</h2>
            <p className="text-sm text-muted-foreground">Manage user quotas and access.</p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-md p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-muted/20 border-b border-border">
           <div className="bg-background border border-border p-4 rounded-lg shadow-sm">
             <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Users</div>
             <div className="text-2xl font-bold mt-1">{totalUsers}</div>
           </div>
           <div className="bg-background border border-border p-4 rounded-lg shadow-sm">
             <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total API Calls</div>
             <div className="text-2xl font-bold mt-1 text-primary">{totalUsage}</div>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
          
          {/* User Table */}
          {loading ? (
             <div className="flex h-32 items-center justify-center">
               <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
             </div>
          ) : (
            <div className="w-full overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Usage / Limit</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => {
                    const usagePercent = Math.min((user.usage_count / user.usage_limit) * 100, 100);
                    const isOverLimit = user.usage_count >= user.usage_limit;
                    const isProcessing = actionLoading === user.id;

                    return (
                      <tr key={user.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4 font-medium max-w-[200px] truncate" title={user.email}>
                          {user.email}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-4 w-1/3 min-w-[200px]">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs">
                              <span className={isOverLimit ? "text-destructive font-bold" : "text-foreground"}>
                                {user.usage_count}
                              </span>
                              <span className="text-muted-foreground">
                                / {user.usage_limit}
                              </span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isOverLimit ? 'bg-destructive' : usagePercent > 80 ? 'bg-yellow-500' : 'bg-green-500'
                                }`} 
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button
                               onClick={() => handleResetQuota(user.id)}
                               disabled={isProcessing}
                               className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-md border border-input hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors"
                               title="Reset usage to 0"
                             >
                               {isProcessing ? '...' : 'Reset'}
                             </button>
                             <button
                               onClick={() => handleGrantVIP(user.id)}
                               disabled={isProcessing}
                               className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                               title="Set limit to 1000"
                             >
                               {isProcessing ? '...' : 'VIP'}
                             </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* System Health Section */}
          <div className="border border-border rounded-lg p-4 bg-muted/10">
              <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">System Diagnostics</h3>
                  <button 
                    onClick={runDiagnostics}
                    disabled={healthStatus === 'checking'}
                    className="text-xs border border-input bg-background hover:bg-accent px-3 py-1.5 rounded transition-colors"
                  >
                    {healthStatus === 'checking' ? 'Testing...' : 'Run Diagnostics'}
                  </button>
              </div>
              <div className="text-xs font-mono bg-background p-3 rounded border border-border min-h-[60px] whitespace-pre-wrap break-all">
                  {healthStatus === 'idle' && <span className="text-muted-foreground">Ready to test connection to Edge Function...</span>}
                  {healthStatus === 'checking' && <span className="text-blue-500">Connecting...</span>}
                  {healthStatus === 'ok' && <span className="text-green-500 font-bold">✅ {healthMessage}</span>}
                  {healthStatus === 'error' && <span className="text-destructive font-bold">❌ {healthMessage}</span>}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                  Use this to check if the Supabase Edge Function is deployed and reachable (CORS check).
              </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
