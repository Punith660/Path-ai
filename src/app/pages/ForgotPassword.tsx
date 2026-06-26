import React, { useState } from 'react';
import { Link } from 'react-router';
import { Shield, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../context/VerificationContext';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email is required.');
      return;
    }

    setLoading(true);
    const endpoint = API_BASE_URL ? `${API_BASE_URL}/api/auth/forgot-password` : '/api/auth/forgot-password';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const errData = await response.text();
        let errMsg = 'Request failed.';
        try {
          const parsed = JSON.parse(errData);
          if (parsed.detail) errMsg = parsed.detail;
        } catch {
          if (errData) errMsg = errData;
        }
        throw new Error(errMsg);
      }

      setSubmitted(true);
      toast.success('If an account with that email exists, a reset link has been sent.');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-lg bg-electric-blue/10 border border-electric-blue/20">
              <Mail className="w-6 h-6 text-electric-blue" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              PathAI <span className="text-electric-blue">Verify</span>
            </h1>
          </div>

          <div className="glass-card rounded-xl border border-border p-6 shadow-xl space-y-4 text-center">
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              If an account with <span className="text-foreground font-medium">{email}</span> exists,
              we've sent a password reset link. Check your inbox and spam folder.
            </p>
            <p className="text-xs text-muted-foreground">
              The link will expire in 15 minutes.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm text-electric-blue hover:underline font-medium"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to login
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

        {/* Forgot Password Card */}
        <div className="glass-card rounded-xl border border-border p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Forgot password?</h2>
            <p className="text-xs text-muted-foreground">
              Enter your email address and we'll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="[EMAIL]"
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
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <Mail className="h-4 w-4 text-white" />
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