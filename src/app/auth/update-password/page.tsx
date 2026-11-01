'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { formatAuthErrorMessage, updatePasswordFromRecovery } from '@/lib/simAuth';

type PageState = 'loading' | 'ready' | 'no_session';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recoverySessionRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let timeoutId: number | null = null;

    const applySession = (session: Session | null) => {
      if (session?.user) {
        recoverySessionRef.current = true;
        if (timeoutId != null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        setPageState('ready');
        return true;
      }
      return false;
    };

    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        applySession(session);
      }
    });

    timeoutId = window.setTimeout(() => {
      if (!recoverySessionRef.current) {
        setPageState('no_session');
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePasswordFromRecovery(password);
      router.replace('/auth/sign-in?message=password_updated');
    } catch (err) {
      setError(formatAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pageState === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="text-sm text-slate-600">Checking your reset link…</p>
      </main>
    );
  }

  if (pageState === 'no_session') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-950">Reset link invalid or expired</h1>
          <p className="mt-2 text-sm text-slate-600">
            Open the latest link from your email, or request a new reset from the sign-in page.
          </p>
          <a
            href="/auth/sign-in"
            className="mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to sign in
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-600">Choose a new password for your account.</p>

        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="new-password" className="mb-1 block text-xs font-medium text-slate-600">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-xs font-medium text-slate-600">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>
    </main>
  );
}
