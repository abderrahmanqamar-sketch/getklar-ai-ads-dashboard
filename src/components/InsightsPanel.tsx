import { Insight } from '../types';
import { Lightbulb, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';

interface InsightsPanelProps {
  insights: Insight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const getIcon = (type: string) => {
    if (type.includes('Potential')) return <Lightbulb size={20} className="text-amber-400 shrink-0" />;
    if (type.includes('Improvement')) return <TrendingUp size={20} className="text-emerald-400 shrink-0" />;
    return <AlertTriangle size={20} className="text-rose-400 shrink-0" />;
  };

  const getBadgeClass = (type: string) => {
    if (type.includes('Potential')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (type.includes('Improvement')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  };

  return (
    <div className="bg-gradient-to-b from-slate-800 to-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden shadow-lg flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-700 bg-slate-800 flex items-center gap-2">
        <Sparkles size={18} className="text-purple-400" />
        <h2 className="text-lg font-bold text-white">AI Insights</h2>
      </div>
      
      <div className="p-5 flex-1 overflow-y-auto space-y-4">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
            <div className="animate-pulse flex items-center gap-2">
              <Sparkles size={16} /> Generating insights...
            </div>
          </div>
        ) : (
          insights.map((insight) => (
            <div key={insight.id} className="relative bg-slate-900/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors group">
              <div className="flex gap-3">
                <div className="mt-0.5">
                  {getIcon(insight.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                     <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md border ${getBadgeClass(insight.type)}`}>
                       {insight.type.replace(/[^a-zA-Z]/g, '')}
                     </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
