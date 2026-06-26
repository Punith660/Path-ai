import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { Shield, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../context/VerificationContext';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      toast.error('Both fields are required.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    const endpoint = API_BASE_URL ? `${API_BASE_URL}/api/auth/reset-password` : '/api/auth/reset-password';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });

      if (!response.ok) {
        const errData = await response.text();
        let errMsg = 'Reset failed.';
        try {
          const parsed = JSON.parse(errData);
          if (parsed.detail) errMsg = parsed.detail;
        } catch {
          if (errData) errMsg = errData;
        }
        throw new Error(errMsg);
      }

      setSubmitted(true);
      toast.success('Password has been reset successfully.');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="glass-card rounded-xl border border-border p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">Invalid reset link</h2>
            <p className="text-sm text-muted-foreground">
              This reset link is invalid. Please request a new one.
            </p>
            <div className="pt-2">
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-1 text-sm text-electric-blue hover:underline font-medium"
              >
                Request new reset link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="glass-card rounded-xl border border-border p-6 shadow-xl space-y-4">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mx-auto">
              <KeyRound className="w-6 h-6 text-emerald-500" />
            </div>
            <h2 className="text-lg font-semibold">Password reset successful</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been updated. Redirecting to login...
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm text-electric-blue hover:underline font-medium"
              >
                <ArrowLeft className="h-3 w-3" />
                Go to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Reset Password Card */}
        <div className="glass-card rounded-xl border border-border p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Reset your password</h2>
            <p className="text-xs text-muted-foreground">
              Enter a new password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider" htmlFor="password">
                New Password
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
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                disabled={loading}
                className="w-full flex h-10 rounded-md border border-border px-3 py-1.5 text-sm bg-secondary/40 text-foreground transition-all duration-200 outline-none focus:border-electric-blue placeholder:text-muted-foreground/60 disabled:opacity-50"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-electric-blue text-white hover:bg-electric-blue/90 font-medium text-sm transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <KeyRound className="h-4 w-4 text-white" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-border flex justify-center text-xs">
            <Link to="/login" className="inline-flex items-center gap-1 text-electric-blue hover:underline font-medium">
              <ArrowLeft className="h-3 w-3" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}