import { Campaign, DailyDataPoint } from '../types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type KPIBandMode = 'general' | 'meta';

interface Props {
  campaign: Campaign;
  mode: KPIBandMode;
}

function getRecentDays(campaign: Campaign, days: number, offset: number = 0): DailyDataPoint[] {
  return [...campaign.dailyData]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(offset, offset + days);
}

function aggregatePoints(points: DailyDataPoint[]) {
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
    revenue: agg.revenue,
    conversions: agg.conversions,
    poas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
    ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
    cpc: agg.clicks > 0 ? agg.spend / agg.clicks : 0,
    cpm: agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0,
  };
}

function DeltaBadge({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) {
  if (previous === 0 && current === 0) return <span className="text-slate-500 text-xs">—</span>;
  const diff = previous !== 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
  const isGood = inverse ? diff < 0 : diff > 0;
  const isNeutral = Math.abs(diff) < 1;
  const color = isNeutral ? 'text-slate-500' : isGood ? 'text-emerald-400' : 'text-red-400';
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      {diff > 0.5 ? <TrendingUp size={11} /> : diff < -0.5 ? <TrendingDown size={11} /> : <Minus size={11} />}
      {Math.abs(diff).toFixed(1)}%
    </span>
  );
}

function KPICard({ label, current, previous, format, inverse = false }: {
  label: string;
  current: number;
  previous: number;
  format: (v: number) => string;
  inverse?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[80px]">
      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">{label}</span>
      <span className="text-sm font-bold text-white">{format(current)}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500">{format(previous)}</span>
        <DeltaBadge current={current} previous={previous} inverse={inverse} />
      </div>
    </div>
  );
}

function PeriodRow({ campaign, period, mode }: { campaign: Campaign; period: 7 | 14; mode: KPIBandMode }) {
  const curr = aggregatePoints(getRecentDays(campaign, period, 0));
  const prev = aggregatePoints(getRecentDays(campaign, period, period));

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3">
        {period}d vs prev {period}d
      </div>
      <div className="flex flex-wrap gap-5">
        {mode === 'general' ? (
          <>
            <KPICard label="Spend" current={curr.spend} previous={prev.spend} format={v => `€${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <KPICard label="POAS" current={curr.poas} previous={prev.poas} format={v => `${v.toFixed(2)}x`} />
            <KPICard label="aPOAS" current={curr.poas} previous={prev.poas} format={v => `${v.toFixed(2)}x`} />
          </>
        ) : (
          <>
            <KPICard label="Revenue" current={curr.revenue} previous={prev.revenue} format={v => `€${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <KPICard label="Sales" current={curr.conversions} previous={prev.conversions} format={v => String(Math.round(v))} />
            <KPICard label="CPM" current={curr.cpm} previous={prev.cpm} format={v => `€${v.toFixed(2)}`} inverse />
            <KPICard label="CTR" current={curr.ctr} previous={prev.ctr} format={v => `${v.toFixed(2)}%`} />
            <KPICard label="CPC" current={curr.cpc} previous={prev.cpc} format={v => `€${v.toFixed(2)}`} inverse />
          </>
        )}
      </div>
    </div>
  );
}

export function CampaignKPIBand({ campaign, mode }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <PeriodRow campaign={campaign} period={7} mode={mode} />
      <PeriodRow campaign={campaign} period={14} mode={mode} />
    </div>
  );
}
