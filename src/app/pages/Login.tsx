import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Shield, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const { login, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Get the redirect path from location state or default to root '/'
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    clearError();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Both fields are required.');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password.trim());
      toast.success('Successfully logged in.');
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-lg bg-electric-blue/10 border border-electric-blue/20">
            <Shield className="w-6 h-6 text-electric-blue" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            PathAI <span className="text-electric-blue">Verify</span>
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Resume Credential Validation Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-xl border border-border p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Welcome back</h2>
            <p className="text-xs text-muted-foreground">Sign in to access secure features and history.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
                className="w-full flex h-10 rounded-md border border-border px-3 py-1.5 text-sm bg-secondary/40 text-foreground transition-all duration-200 outline-none focus:border-electric-blue placeholder:text-muted-foreground/60 disabled:opacity-50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full flex h-10 rounded-md border border-border px-3 py-1.5 text-sm bg-secondary/40 text-foreground transition-all duration-200 outline-none focus:border-electric-blue placeholder:text-muted-foreground/60 disabled:opacity-50"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-electric-blue text-white hover:bg-electric-blue/90 font-medium text-sm transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 text-white" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-border flex justify-center text-xs">
            <span className="text-muted-foreground mr-1">Don't have an account?</span>
            <Link to="/register" className="text-electric-blue hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
