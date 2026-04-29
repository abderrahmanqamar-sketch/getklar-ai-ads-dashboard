import { useState } from 'react';
import { ApiConnect } from './components/ApiConnect';
import { KPIBar } from './components/KPIBar';
import { CampaignCharts } from './components/CampaignCharts';
import { BucketOverview } from './components/BucketOverview';
import { ComparisonTable } from './components/ComparisonTable';
import { InsightsPanel } from './components/InsightsPanel';
import { ChatInterface } from './components/ChatInterface';
import { MetaCampaignView } from './components/MetaCampaignView';
import { useGetKlar } from './hooks/useGetKlar';
import { BucketType } from './types';
import { LayoutDashboard, LogOut, ChevronDown, ChevronRight } from 'lucide-react';

type TabView = 'overview' | 'campaigns' | 'meta';

const GETKLAR_TOKEN = import.meta.env.VITE_GETKLAR_REFRESH_TOKEN as string;

function App() {
  const [unlocked, setUnlocked] = useState(false);
  const { campaigns, insights, loading, error } = useGetKlar(unlocked ? GETKLAR_TOKEN : null);
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const nonBranding = campaigns.filter(c => c.bucket !== 'branding');
    setExpandedCampaigns(new Set(nonBranding.map(c => c.id)));
  };

  const collapseAll = () => setExpandedCampaigns(new Set());

  if (!unlocked) {
    return <ApiConnect onConnect={() => setUnlocked(true)} />;
  }

  // Group campaigns by bucket (excluding branding for the main views)
  const buckets: BucketType[] = ['newcustomer', 'retention', 'switzerland'];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-purple-500/20">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">GetKlar AI</span>
          </div>

          {/* Tab navigation */}
          <div className="flex bg-slate-800/60 rounded-xl p-0.5 border border-slate-700/50">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-purple-500/25 text-purple-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-purple-500/25 text-purple-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('meta')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'meta'
                  ? 'bg-purple-500/25 text-purple-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Meta
            </button>
          </div>

          <button 
            onClick={() => setUnlocked(false)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700"
          >
            <LogOut size={16} />
            Disconnect
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-32 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            <p className="text-slate-400 text-sm animate-pulse">Syncing campaign data & analyzing insights...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex flex-col items-center max-w-lg mx-auto mt-20">
            <p className="mb-6 font-medium text-center">{error}</p>
            <button 
              onClick={() => setUnlocked(false)}
              className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-colors font-medium text-sm"
            >
              Reset Connection
            </button>
          </div>
        ) : (
          <>
            {/* KPI Bar — always visible */}
            <KPIBar campaigns={campaigns} />

            {activeTab === 'overview' && (
              <>
                {/* Comparison Table: 7d vs prev 7d with period selector */}
                <ComparisonTable campaigns={campaigns} />

                {/* Bucket aggregate views */}
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white">Account Overview by Group</h2>
                  {buckets.map(bucket => (
                    <BucketOverview key={bucket} campaigns={campaigns} bucket={bucket} />
                  ))}
                </div>

                {/* AI Insights + Chat at bottom */}
                <div className="flex gap-6 flex-col xl:flex-row">
                  <div className="flex-1 min-w-0">
                    <InsightsPanel insights={insights} />
                  </div>
                  <div className="w-full xl:w-[420px] shrink-0 min-h-[450px]">
                    <ChatInterface campaigns={campaigns} />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'campaigns' && (() => {
              const allPlatforms = [...new Set(campaigns.map(c => c.platform))].sort();
              const visibleCampaigns = campaigns
                .filter(c => c.bucket !== 'branding')
                .filter(c => platformFilter === 'all' || c.platform === platformFilter);

              const platformColor = (p: string) => {
                if (p === 'meta') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
                if (p === 'google') return 'bg-red-500/15 text-red-400 border-red-500/30';
                if (p === 'tiktok') return 'bg-pink-500/15 text-pink-400 border-pink-500/30';
                return 'bg-slate-700/50 text-slate-400 border-slate-600/30';
              };

              return (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-xl font-bold text-white">Per-Campaign Performance</h2>
                  <div className="flex gap-2 flex-wrap items-center">
                    {/* Platform filter */}
                    <div className="flex bg-slate-700/50 rounded-xl p-0.5 border border-slate-600/30">
                      <button
                        onClick={() => setPlatformFilter('all')}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${platformFilter === 'all' ? 'bg-purple-500/30 text-purple-300' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        All
                      </button>
                      {allPlatforms.map(p => (
                        <button
                          key={p}
                          onClick={() => setPlatformFilter(p)}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition-all capitalize ${platformFilter === p ? 'bg-purple-500/30 text-purple-300' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={expandAll}
                      className="text-xs text-slate-400 hover:text-purple-300 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg transition-colors"
                    >
                      Expand all
                    </button>
                    <button
                      onClick={collapseAll}
                      className="text-xs text-slate-400 hover:text-purple-300 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg transition-colors"
                    >
                      Collapse all
                    </button>
                  </div>
                </div>

                {visibleCampaigns.map(campaign => (
                  <div key={campaign.id}>
                    <button
                      onClick={() => toggleCampaign(campaign.id)}
                      className="w-full flex items-center justify-between px-5 py-3 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {expandedCampaigns.has(campaign.id) ? (
                          <ChevronDown size={16} className="text-purple-400 shrink-0" />
                        ) : (
                          <ChevronRight size={16} className="text-slate-500 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-slate-200 truncate max-w-[400px]">{campaign.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-700/50 text-slate-400 border border-slate-600/30 shrink-0">
                          {campaign.bucket === 'switzerland' ? '🇨🇭' : campaign.bucket === 'retention' ? '🔁' : '🚀'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg border capitalize shrink-0 ${platformColor(campaign.platform)}`}>
                          {campaign.platform}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                        <span>€{campaign.spend.toFixed(2)}</span>
                        <span>POAS {campaign.roas.toFixed(2)}x</span>
                        <span>CTR {campaign.ctr.toFixed(2)}%</span>
                      </div>
                    </button>

                    {expandedCampaigns.has(campaign.id) && (
                      <div className="mt-2">
                        <CampaignCharts campaign={campaign} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              );
            })()}

            {activeTab === 'meta' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Meta Dashboard</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Platform-tracked revenue, sales & ad delivery metrics per campaign</p>
                  </div>
                </div>

                {campaigns
                  .filter(c => c.bucket !== 'branding')
                  .map(campaign => (
                  <div key={campaign.id}>
                    <button
                      onClick={() => toggleCampaign(campaign.id)}
                      className="w-full flex items-center justify-between px-5 py-3 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedCampaigns.has(campaign.id) ? (
                          <ChevronDown size={16} className="text-purple-400" />
                        ) : (
                          <ChevronRight size={16} className="text-slate-500" />
                        )}
                        <span className="text-sm font-medium text-slate-200 truncate max-w-[500px]">{campaign.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-700/50 text-slate-400 border border-slate-600/30">
                          {campaign.bucket === 'switzerland' ? '🇨🇭' : campaign.bucket === 'retention' ? '🔁' : '🚀'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>€{campaign.revenue.toFixed(2)} rev</span>
                        <span>CPM €{campaign.cpm.toFixed(2)}</span>
                        <span>CTR {campaign.ctr.toFixed(2)}%</span>
                        <span>CPC €{campaign.cpc.toFixed(2)}</span>
                      </div>
                    </button>

                    {expandedCampaigns.has(campaign.id) && (
                      <div className="mt-2">
                        <MetaCampaignView campaign={campaign} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
