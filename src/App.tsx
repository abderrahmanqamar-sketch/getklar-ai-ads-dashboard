import { useState, useMemo } from 'react';
import { ApiConnect } from './components/ApiConnect';
import { NeedsAttention } from './components/NeedsAttention';
import { AllCampaigns } from './components/AllCampaigns';
import { useGetKlar } from './hooks/useGetKlar';
import { DateRange, PlatformFilter, StatusFilter, SortBy, AttributionModel, ATTRIBUTION_LABELS, AttributionWindow, WINDOW_LABELS, DateBreakdown, DATE_BREAKDOWN_LABELS } from './types';
import { isActive, getComparisonStats } from './lib/comparison';
import { LayoutDashboard, Lock, ChevronDown } from 'lucide-react';

const GETKLAR_TOKEN = import.meta.env.VITE_GETKLAR_REFRESH_TOKEN as string;

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700/60 gap-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            value === opt.value
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SortDropdown({ value, onChange }: { value: SortBy; onChange: (v: SortBy) => void }) {
  const labels: Record<SortBy, string> = {
    'highest-spend': 'Highest Spend',
    'lowest-poas': 'Lowest POAS',
  };
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value as SortBy)}
        className="appearance-none bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-medium rounded-lg pl-3 pr-8 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500 hover:border-slate-600 transition-colors"
      >
        {(Object.keys(labels) as SortBy[]).map(k => (
          <option key={k} value={k}>{labels[k]}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [attributionModel, setAttributionModel] = useState<AttributionModel>('data_driven');
  const [attrWindow, setAttrWindow] = useState<AttributionWindow>('unlimited');
  const [dateBreakdown, setDateBreakdown] = useState<DateBreakdown>('order');
  const { campaigns, loading, error } = useGetKlar(unlocked ? GETKLAR_TOKEN : null, attributionModel, attrWindow, dateBreakdown);

  const [dateRange, setDateRange] = useState<DateRange>('7v7');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('highest-spend');
  const [focusCampaignId, setFocusCampaignId] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    let result = campaigns.filter(c => c.bucket !== 'branding');

    if (platformFilter !== 'all') {
      result = result.filter(c => c.platform === platformFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(c => isActive(c) === (statusFilter === 'active'));
    }

    if (sortBy === 'highest-spend') {
      result = [...result].sort((a, b) => {
        const aStats = getComparisonStats(a, dateRange).current;
        const bStats = getComparisonStats(b, dateRange).current;
        return bStats.spend - aStats.spend;
      });
    } else {
      result = [...result].sort((a, b) => {
        const aStats = getComparisonStats(a, dateRange).current;
        const bStats = getComparisonStats(b, dateRange).current;
        return aStats.poas - bStats.poas;
      });
    }

    return result;
  }, [campaigns, platformFilter, statusFilter, sortBy, dateRange]);

  if (!unlocked) {
    return <ApiConnect onConnect={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-1.5 rounded-lg shadow-lg shadow-purple-500/20">
              <LayoutDashboard size={16} className="text-white" />
            </div>
            <span className="font-bold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              GetKlar AI
            </span>
          </div>

          <div className="w-px h-5 bg-slate-700 shrink-0" />

          {/* Controls */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
            <SegmentedControl<DateRange>
              options={[
                { label: '7 vs 7', value: '7v7' },
                { label: '14 vs 14', value: '14v14' },
                { label: '30 Days', value: '30d' },
              ]}
              value={dateRange}
              onChange={setDateRange}
            />

            <div className="w-px h-5 bg-slate-700 shrink-0" />

            <SegmentedControl<PlatformFilter>
              options={[
                { label: 'All', value: 'all' },
                { label: 'Meta', value: 'meta' },
                { label: 'Google', value: 'google' },
              ]}
              value={platformFilter}
              onChange={setPlatformFilter}
            />

            <div className="w-px h-5 bg-slate-700 shrink-0" />

            <SegmentedControl<StatusFilter>
              options={[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Paused', value: 'paused' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />

            <div className="w-px h-5 bg-slate-700 shrink-0" />

            <SortDropdown value={sortBy} onChange={setSortBy} />

            <div className="w-px h-5 bg-slate-700 shrink-0" />

            {/* Attribution model */}
            <div className="relative shrink-0">
              <select
                value={attributionModel}
                onChange={e => setAttributionModel(e.target.value as AttributionModel)}
                className="appearance-none bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-medium rounded-lg pl-3 pr-8 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500 hover:border-slate-600 transition-colors"
              >
                {(Object.keys(ATTRIBUTION_LABELS) as AttributionModel[]).map(k => (
                  <option key={k} value={k}>{ATTRIBUTION_LABELS[k]}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Attribution window */}
            <div className="relative shrink-0">
              <select
                value={attrWindow}
                onChange={e => setAttrWindow(e.target.value as AttributionWindow)}
                className="appearance-none bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-medium rounded-lg pl-3 pr-8 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500 hover:border-slate-600 transition-colors"
              >
                {(Object.keys(WINDOW_LABELS) as AttributionWindow[]).map(k => (
                  <option key={k} value={k}>{WINDOW_LABELS[k]}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Date breakdown */}
            <div className="relative shrink-0">
              <select
                value={dateBreakdown}
                onChange={e => setDateBreakdown(e.target.value as DateBreakdown)}
                className="appearance-none bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-medium rounded-lg pl-3 pr-8 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500 hover:border-slate-600 transition-colors"
              >
                {(Object.keys(DATE_BREAKDOWN_LABELS) as DateBreakdown[]).map(k => (
                  <option key={k} value={k}>{DATE_BREAKDOWN_LABELS[k]}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Lock */}
          <button
            onClick={() => setUnlocked(false)}
            className="shrink-0 p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            title="Lock dashboard"
          >
            <Lock size={15} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-32 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
            <p className="text-slate-400 text-sm animate-pulse">Syncing campaign data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex flex-col items-center max-w-lg mx-auto mt-20">
            <p className="mb-6 font-medium text-center">{error}</p>
            <button
              onClick={() => setUnlocked(false)}
              className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-colors font-medium text-sm"
            >
              Reset
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            <NeedsAttention
              campaigns={filteredCampaigns}
              dateRange={dateRange}
              onSelect={setFocusCampaignId}
            />
            <AllCampaigns
              campaigns={filteredCampaigns}
              dateRange={dateRange}
              focusCampaignId={focusCampaignId}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
