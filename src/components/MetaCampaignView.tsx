import { Campaign } from '../types';
import { CampaignKPIBand } from './CampaignKPIBand';
import { CampaignTrendChart } from './CampaignTrendChart';

interface Props {
  campaign: Campaign;
}

export function MetaCampaignView({ campaign }: Props) {
  if (campaign.dailyData.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
        <p className="text-sm text-slate-500">No data available for this campaign.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white truncate max-w-[80%]">{campaign.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Platform-tracked metrics</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-lg border ${
          campaign.bucket === 'switzerland'
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            : campaign.bucket === 'retention'
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            : 'bg-green-500/10 text-green-400 border-green-500/20'
        }`}>
          {campaign.bucket === 'switzerland' ? '🇨🇭 CH' : campaign.bucket === 'retention' ? '🔁 Retention' : '🚀 New Customer'}
        </span>
      </div>

      {/* KPI comparison: 7v7 and 14v14 – Revenue, Sales, CPM, CTR, CPC */}
      <CampaignKPIBand campaign={campaign} mode="meta" />

      {/* Revenue / CPM / CTR / CPC trend charts with period selector */}
      <CampaignTrendChart campaign={campaign} mode="meta" />
    </div>
  );
}
