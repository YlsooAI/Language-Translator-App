import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        else onClose();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) setError(error.message);
        else if (data.session) onClose();
        else setInfo('Check your email to confirm your account, then sign in.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'w-full h-11 px-3 rounded-lg border border-[#dadce0] bg-transparent text-sm text-[#202124] outline-none focus:border-[#0b57d0] focus:ring-1 focus:ring-[#0b57d0] placeholder:text-[#5f6368] dark:border-[#3c4043] dark:text-[#e8eaed] dark:focus:border-[#8ab4f8] dark:focus:ring-[#8ab4f8] dark:placeholder:text-[#9aa0a6]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202124]/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[400px] bg-white rounded-2xl p-6 sm:p-8 dark:bg-[#2d2e31]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <img src="./logo.png" alt="Translator" className="h-9 w-9 object-contain dark:invert" />
          <button
            onClick={onClose}
            className="p-2 -m-2 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] dark:text-[#9aa0a6] dark:hover:bg-[#26282b] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="mt-4 text-2xl text-[#202124] dark:text-[#e8eaed]">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h2>
        <p className="mt-1 text-sm text-[#5f6368] dark:text-[#9aa0a6]">to continue to Translator</p>

        {!isSupabaseConfigured ? (
          <p className="mt-6 text-sm text-[#d93025] dark:text-[#f28b82]">
            Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your
            .env file and restart the dev server.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={inputCls}
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={inputCls}
            />
            {error && <p className="text-sm text-[#d93025] dark:text-[#f28b82]">{error}</p>}
            {info && <p className="text-sm text-[#188038] dark:text-[#81c995]">{info}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-full bg-[#0b57d0] hover:bg-[#094fb0] disabled:opacity-60 text-white text-sm font-medium transition-colors dark:bg-[#a8c7fa] dark:hover:bg-[#c2d7fc] dark:text-[#062e6f]"
            >
              {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}
              className="w-full text-center text-sm font-medium text-[#0b57d0] hover:underline dark:text-[#8ab4f8]"
            >
              {mode === 'signin' ? 'Create account' : 'Sign in instead'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
