import { Campaign, BucketType, BUCKET_LABELS, DailyDataPoint } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface BucketOverviewProps {
  campaigns: Campaign[];
  bucket: BucketType;
}

interface ChartConfig {
  key: string;
  label: string;
  color: string;
  format: (v: number) => string;
}

const CHART_CONFIGS: ChartConfig[] = [
  { key: 'ctr', label: 'CTR (%)', color: '#a78bfa', format: (v) => `${v.toFixed(2)}%` },
  { key: 'cpc', label: 'CPC (€)', color: '#34d399', format: (v) => `€${v.toFixed(2)}` },
  { key: 'cpm', label: 'CPM (€)', color: '#f59e0b', format: (v) => `€${v.toFixed(2)}` },
  { key: 'impressions', label: 'Impressions', color: '#60a5fa', format: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)) },
  { key: 'spend', label: 'Amount Spent (€)', color: '#f472b6', format: (v) => `€${v.toFixed(2)}` },
];

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

/**
 * Aggregate all daily data from multiple campaigns by date.
 */
function aggregateDailyAcrossCampaigns(campaigns: Campaign[]): DailyDataPoint[] {
  const dateMap: Record<string, DailyDataPoint> = {};

  for (const camp of campaigns) {
    for (const dp of camp.dailyData) {
      if (!dateMap[dp.date]) {
        dateMap[dp.date] = {
          date: dp.date,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          ctr: 0,
          cpc: 0,
          cpm: 0,
        };
      }
      dateMap[dp.date].spend += dp.spend;
      dateMap[dp.date].impressions += dp.impressions;
      dateMap[dp.date].clicks += dp.clicks;
      dateMap[dp.date].conversions += dp.conversions;
      dateMap[dp.date].revenue += dp.revenue;
    }
  }

  // Recalculate derived metrics
  const points = Object.values(dateMap);
  for (const dp of points) {
    dp.ctr = dp.impressions > 0 ? (dp.clicks / dp.impressions) * 100 : 0;
    dp.cpc = dp.clicks > 0 ? dp.spend / dp.clicks : 0;
    dp.cpm = dp.impressions > 0 ? (dp.spend / dp.impressions) * 1000 : 0;
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

function MiniChart({ data, config }: { data: DailyDataPoint[]; config: ChartConfig }) {
  const chartData = data.map(d => ({
    date: formatDateLabel(d.date),
    value: (d as any)[config.key] as number,
  }));

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-300">{config.label}</h4>
        {data.length > 0 && (
          <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-slate-700/50 text-slate-300">
            {config.format((data[data.length - 1] as any)[config.key] as number)}
          </span>
        )}
      </div>
      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={{ stroke: '#475569' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={45}
              tickFormatter={(v) => config.format(v)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#e2e8f0',
              }}
              formatter={(value: number) => [config.format(value), config.label]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: config.color, stroke: '#1e293b', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BucketOverview({ campaigns, bucket }: BucketOverviewProps) {
  const bucketCampaigns = campaigns.filter(c => c.bucket === bucket);

  if (bucketCampaigns.length === 0) return null;

  const aggregatedDaily = aggregateDailyAcrossCampaigns(bucketCampaigns);

  // Totals
  const totalSpend = bucketCampaigns.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = bucketCampaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = bucketCampaigns.reduce((s, c) => s + c.clicks, 0);
  const totalRevenue = bucketCampaigns.reduce((s, c) => s + c.revenue, 0);

  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{BUCKET_LABELS[bucket]}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{bucketCampaigns.length} campaign{bucketCampaigns.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Spend', value: `€${totalSpend.toFixed(2)}` },
          { label: 'ROAS', value: roas.toFixed(2) + 'x' },
          { label: 'CTR', value: avgCtr.toFixed(2) + '%' },
          { label: 'CPC', value: `€${avgCpc.toFixed(2)}` },
          { label: 'CPM', value: `€${avgCpm.toFixed(2)}` },
        ].map(stat => (
          <div key={stat.label} className="text-center py-2 px-1 bg-slate-700/30 rounded-xl">
            <div className="text-xs text-slate-500 mb-0.5">{stat.label}</div>
            <div className="text-sm font-semibold text-slate-200">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHART_CONFIGS.map(config => (
          <MiniChart key={config.key} data={aggregatedDaily} config={config} />
        ))}
      </div>

      {/* Campaign list within this bucket */}
      <div className="mt-2">
        <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Campaigns in this group</p>
        <div className="flex flex-wrap gap-2">
          {bucketCampaigns.map(c => (
            <span key={c.id} className="text-xs px-2.5 py-1 bg-slate-700/40 rounded-lg text-slate-400 border border-slate-600/30">
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
