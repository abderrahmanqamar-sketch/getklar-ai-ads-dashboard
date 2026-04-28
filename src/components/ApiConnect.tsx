import React, { useState } from 'react';
import { KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

interface ApiConnectProps {
  onConnect: (key: string) => void;
}

export function ApiConnect({ onConnect }: ApiConnectProps) {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim().length > 0) {
      onConnect(key.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-primary-light rounded-full text-primary">
            <KeyRound size={40} className="text-purple-400" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-white mb-2">Connect GetKlar</h1>
        <p className="text-slate-400 text-center mb-8">
          Enter your API key to sync your advertising data and unlock AI insights.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300 mb-2">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="sk_test_..."
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={!key.trim()}
            className="w-full flex items-center justify-center py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors group"
          >
            Connect Dashboard
            <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center text-xs text-slate-500 space-x-1">
          <ShieldCheck size={14} />
          <span>Your key is stored in memory and never saved.</span>
        </div>
      </div>
    </div>
  );
}
