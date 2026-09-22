import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {  Lock, User, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowRight, Wallet } from 'lucide-react';
import logo from '@/assets/digitpointage-logo.svg';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* Layered gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950" />

      {/* Floating orbs */}
      <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-cyan-500/15 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" style={{ animationDelay: '0.8s' }} />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo + branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-blue-500 to-cyan-400 shadow-2xl shadow-blue-500/40 animate-pulse-glow">
            <Wallet className="text-white" size={38} />
          </div>
          <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-3xl bg-transparent shadow-none">
            <img src={logo} alt="DigitPointage" className="h-28 w-28 object-contain" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-blue-600">
            DigitPointage
          </h1>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} className="text-cyan-400/70" />
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">SMART</p>
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Connexion</h2>
            <p className="mt-1 text-sm text-slate-400">Accédez à votre espace de gestion</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 animate-slide-up">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Nom d'utilisateur</label>
              <div className="group relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-400" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Entrez votre identifiant"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Mot de passe</label>
              <div className="group relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Entrez votre mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-500 hover:to-cyan-400 hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          DigitPointage SMART — Tous droits réservés
        </p>
      </div>
    </div>
  );
}
