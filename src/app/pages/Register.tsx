import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Shield, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function Register() {
  const { register, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'manager' | 'candidate'>('candidate');
  const [loading, setLoading] = useState(false);

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
    if (!username.trim() || !email.trim() || !password.trim()) {
      toast.error('All fields are required.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password, role);
      toast.success('Account registered and logged in successfully.');
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4 py-8">
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

        {/* Register Card */}
        <div className="glass-card rounded-xl border border-border p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Create an account</h2>
            <p className="text-xs text-muted-foreground">Sign up to rank candidates and save session histories.</p>
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
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@example.com"
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
                placeholder="At least 6 characters"
                disabled={loading}
                className="w-full flex h-10 rounded-md border border-border px-3 py-1.5 text-sm bg-secondary/40 text-foreground transition-all duration-200 outline-none focus:border-electric-blue placeholder:text-muted-foreground/60 disabled:opacity-50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider" htmlFor="role">
                User Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'manager' | 'candidate')}
                disabled={loading}
                className="w-full flex h-10 rounded-md border border-border px-3 py-1.5 text-sm bg-secondary/40 text-foreground transition-all duration-200 outline-none focus:border-electric-blue disabled:opacity-50"
              >
                <option value="candidate">Candidate (Verify Own Resume)</option>
                <option value="manager">Hiring Manager (Rank Candidates)</option>
              </select>
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
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Register & Sign In</span>
                  <ArrowRight className="h-4 w-4 text-white" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-border flex justify-center text-xs">
            <span className="text-muted-foreground mr-1">Already have an account?</span>
            <Link to="/login" className="text-electric-blue hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
