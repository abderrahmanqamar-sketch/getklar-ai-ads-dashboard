import { Campaign, DailyDataPoint } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CampaignKPIBand } from './CampaignKPIBand';
import { CampaignTrendChart } from './CampaignTrendChart';

interface CampaignChartsProps {
  campaign: Campaign;
}

interface ChartConfig {
  key: keyof DailyDataPoint;
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

function MiniChart({ data, config }: { data: DailyDataPoint[]; config: ChartConfig }) {
  const chartData = data.map(d => ({
    date: formatDateLabel(d.date),
    value: d[config.key] as number,
  }));

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-300">{config.label}</h4>
        {data.length > 0 && (
          <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-slate-700/50 text-slate-300">
            {config.format(data[data.length - 1][config.key] as number)}
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

export function CampaignCharts({ campaign }: CampaignChartsProps) {
  if (campaign.dailyData.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">{campaign.name}</h3>
        <p className="text-sm text-slate-500">No daily data available for this campaign.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white truncate max-w-[80%]">{campaign.name}</h3>
        <span className="text-xs text-slate-500 whitespace-nowrap">
          Last {campaign.dailyData.length} days
        </span>
      </div>

      {/* KPI comparison: 7v7 and 14v14 side by side */}
      <CampaignKPIBand campaign={campaign} mode="general" />

      {/* POAS / aPOAS / Spend trend charts with period selector */}
      <CampaignTrendChart campaign={campaign} mode="general" />

      <div className="border-t border-slate-700/40 pt-4">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-medium mb-3">30-day detail</p>
        {/* 5 full 30-day charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHART_CONFIGS.map(config => (
            <MiniChart key={config.key} data={campaign.dailyData} config={config} />
          ))}
        </div>
      </div>
    </div>
  );
}
