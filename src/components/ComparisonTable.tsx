import { useMemo, useState } from 'react';
import { Campaign, BucketType, BUCKET_LABELS } from '../types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonTableProps {
  campaigns: Campaign[];
}

type LookbackPeriod = 7 | 14 | 30;

interface ComparisonRow {
  label: string;
  current: { spend: number; ctr: number; cpc: number; cpm: number; impressions: number; roas: number };
  previous: { spend: number; ctr: number; cpc: number; cpm: number; impressions: number; roas: number };
}

function getRecentDays(campaign: Campaign, days: number, offset: number = 0) {
  const sorted = [...campaign.dailyData].sort((a, b) => b.date.localeCompare(a.date));
  return sorted.slice(offset, offset + days);
}

function aggregatePoints(points: { spend: number; impressions: number; clicks: number; conversions: number; revenue: number }[]) {
  const agg = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
  for (const p of points) {
    agg.spend += p.spend;
    agg.impressions += p.impressions;
    agg.clicks += p.clicks;
    agg.conversions += p.conversions;
    agg.revenue += p.revenue;
  }
  return {
    spend: agg.spend,
    impressions: agg.impressions,
    ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
    cpc: agg.clicks > 0 ? agg.spend / agg.clicks : 0,
    cpm: agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0,
    roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
  };
}

function TrendIcon({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) {
  if (previous === 0 && current === 0) return <Minus size={14} className="text-slate-500" />;
  const diff = previous !== 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
  const pct = Math.abs(diff).toFixed(1);

  // For CPC/CPM, lower is better (inverse=true)
  const isPositive = inverse ? diff < 0 : diff > 0;

  if (Math.abs(diff) < 1) {
    return <span className="flex items-center gap-0.5 text-xs text-slate-500"><Minus size={14} /> {pct}%</span>;
  }

  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
      {diff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {pct}%
    </span>
  );
}

function MetricCell({ current, previous, format, inverse = false }: {
  current: number; previous: number; format: (v: number) => string; inverse?: boolean;
}) {
  return (
    <td className="px-3 py-3 text-right">
      <div className="text-sm font-medium text-slate-200">{format(current)}</div>
      <div className="flex items-center justify-end gap-1 mt-0.5">
        <span className="text-xs text-slate-500">{format(previous)}</span>
        <TrendIcon current={current} previous={previous} inverse={inverse} />
      </div>
    </td>
  );
}

export function ComparisonTable({ campaigns }: ComparisonTableProps) {
  const [lookback, setLookback] = useState<LookbackPeriod>(7);

  const rows = useMemo<ComparisonRow[]>(() => {
    const result: ComparisonRow[] = [];

    // Per-bucket aggregated rows
    const buckets: BucketType[] = ['newcustomer', 'retention', 'switzerland'];
    for (const bucket of buckets) {
      const bucketCamps = campaigns.filter(c => c.bucket === bucket);
      if (bucketCamps.length === 0) continue;

      const currentPoints = bucketCamps.flatMap(c => getRecentDays(c, lookback, 0));
      const previousPoints = bucketCamps.flatMap(c => getRecentDays(c, lookback, lookback));

      result.push({
        label: BUCKET_LABELS[bucket],
        current: aggregatePoints(currentPoints),
        previous: aggregatePoints(previousPoints),
      });
    }

    // Separator row placeholder — we mark total
    const allExclBranding = campaigns.filter(c => c.bucket !== 'branding');
    const totalCurrent = allExclBranding.flatMap(c => getRecentDays(c, lookback, 0));
    const totalPrevious = allExclBranding.flatMap(c => getRecentDays(c, lookback, lookback));

    result.push({
      label: '📊 Total (excl. Branding)',
      current: aggregatePoints(totalCurrent),
      previous: aggregatePoints(totalPrevious),
    });

    return result;
  }, [campaigns, lookback]);

  // Also build per-campaign rows
  const campaignRows = useMemo<ComparisonRow[]>(() => {
    return campaigns
      .filter(c => c.bucket !== 'branding')
      .map(c => {
        const currentPoints = getRecentDays(c, lookback, 0);
        const previousPoints = getRecentDays(c, lookback, lookback);
        return {
          label: c.name,
          current: aggregatePoints(currentPoints),
          previous: aggregatePoints(previousPoints),
        };
      });
  }, [campaigns, lookback]);

  const [showPerCampaign, setShowPerCampaign] = useState(false);

  const fmtEur = (v: number) => `€${v.toFixed(2)}`;
  const fmtPct = (v: number) => `${v.toFixed(2)}%`;
  const fmtX = (v: number) => `${v.toFixed(2)}x`;
  const fmtNum = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));

  const renderRows = (data: ComparisonRow[], isTotal?: boolean) => (
    data.map((row, i) => (
      <tr key={i} className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${
        isTotal && i === data.length - 1 ? 'bg-slate-700/10 font-semibold' : ''
      }`}>
        <td className="px-3 py-3 text-left">
          <span className="text-sm text-slate-300 truncate block max-w-[220px]">{row.label}</span>
        </td>
        <MetricCell current={row.current.spend} previous={row.previous.spend} format={fmtEur} />
        <MetricCell current={row.current.roas} previous={row.previous.roas} format={fmtX} />
        <MetricCell current={row.current.ctr} previous={row.previous.ctr} format={fmtPct} />
        <MetricCell current={row.current.cpc} previous={row.previous.cpc} format={fmtEur} inverse />
        <MetricCell current={row.current.cpm} previous={row.previous.cpm} format={fmtEur} inverse />
        <MetricCell current={row.current.impressions} previous={row.previous.impressions} format={fmtNum} />
      </tr>
    ))
  );

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-white">
          📈 Performance Comparison
        </h3>
        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex bg-slate-700/50 rounded-xl p-0.5 border border-slate-600/30">
            {([7, 14, 30] as LookbackPeriod[]).map(period => (
              <button
                key={period}
                onClick={() => setLookback(period)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  lookback === period
                    ? 'bg-purple-500/30 text-purple-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {period}d
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPerCampaign(!showPerCampaign)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              showPerCampaign
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                : 'text-slate-400 border-slate-600/30 hover:text-slate-200'
            }`}
          >
            {showPerCampaign ? 'Hide' : 'Show'} per campaign
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Last {lookback} days vs. previous {lookback} days · <span className="text-slate-400">Current value</span> / <span className="text-slate-500">Previous</span>
      </p>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Group</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Spend</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">ROAS</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">CTR</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">CPC</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">CPM</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Impr.</th>
            </tr>
          </thead>
          <tbody>
            {renderRows(rows, true)}
          </tbody>
        </table>

        {showPerCampaign && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider px-3">Per Campaign</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Spend</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">ROAS</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">CTR</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">CPC</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">CPM</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Impr.</th>
                </tr>
              </thead>
              <tbody>
                {renderRows(campaignRows)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
