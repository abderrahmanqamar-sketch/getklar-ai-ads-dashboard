import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface ApiConnectProps {
  onConnect: () => void;
}

export function ApiConnect({ onConnect }: ApiConnectProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Moritz1234') {
      onConnect();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-purple-500/10 rounded-full">
            <Lock size={36} className="text-purple-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-1">GetKlar AI</h1>
        <p className="text-slate-400 text-center text-sm mb-8">Enter your password to access the dashboard.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${error ? 'border-red-500/70' : 'border-slate-700'}`}
            placeholder="Password"
            autoFocus
            autoComplete="current-password"
          />
          {error && (
            <p className="text-red-400 text-xs text-center">Incorrect password. Please try again.</p>
          )}
          <button
            type="submit"
            disabled={!password}
            className="w-full flex items-center justify-center py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors group"
          >
            Enter Dashboard
            <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}
