import { useState } from 'react';
import { Campaign, DailyDataPoint } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';

export type TrendChartMode = 'general' | 'meta';
type Period = 7 | 14 | 30;

interface Props {
  campaign: Campaign;
  mode: TrendChartMode;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

// Builds chart data aligning current and previous period by day index.
// For 30d: only current, no "previous" lines.
function buildChartData(dailyData: DailyDataPoint[], period: Period, mode: TrendChartMode) {
  const sorted = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));

  if (period === 30) {
    const recent = sorted.slice(-30);
    return recent.map(dp => ({
      label: formatDateLabel(dp.date),
      ...(mode === 'general'
        ? { poas: +dp.poas.toFixed(3), spend: +dp.spend.toFixed(2) }
        : { revenue: +dp.revenue.toFixed(2), cpm: +dp.cpm.toFixed(2), ctr: +dp.ctr.toFixed(3), cpc: +dp.cpc.toFixed(2) }),
    }));
  }

  const current = sorted.slice(-period);
  const previous = sorted.slice(-(period * 2), -period);
  const len = Math.max(current.length, previous.length);

  return Array.from({ length: len }, (_, i) => {
    const c = current[i];
    const p = previous[i];
    const label = `T-${len - 1 - i}`;

    if (mode === 'general') {
      return {
        label,
        poas: c ? +c.poas.toFixed(3) : null,
        poasPrev: p ? +p.poas.toFixed(3) : null,
        spend: c ? +c.spend.toFixed(2) : null,
        spendPrev: p ? +p.spend.toFixed(2) : null,
      };
    } else {
      return {
        label,
        revenue: c ? +c.revenue.toFixed(2) : null,
        revenuePrev: p ? +p.revenue.toFixed(2) : null,
        cpm: c ? +c.cpm.toFixed(2) : null,
        cpmPrev: p ? +p.cpm.toFixed(2) : null,
        ctr: c ? +c.ctr.toFixed(3) : null,
        ctrPrev: p ? +p.ctr.toFixed(3) : null,
        cpc: c ? +c.cpc.toFixed(2) : null,
        cpcPrev: p ? +p.cpc.toFixed(2) : null,
      };
    }
  });
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1e293b',
    border: '1px solid #475569',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#e2e8f0',
  },
};

const axisProps = {
  tick: { fontSize: 10, fill: '#94a3b8' },
  axisLine: false as const,
  tickLine: false,
};

function MiniTrendChart({
  data,
  dataKey,
  prevKey,
  label,
  color,
  format,
  showPrev,
}: {
  data: Record<string, any>[];
  dataKey: string;
  prevKey?: string;
  label: string;
  color: string;
  format: (v: number) => string;
  showPrev: boolean;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-300">{label}</h4>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
            Current
          </span>
          {showPrev && prevKey && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: color }} />
              Prev
            </span>
          )}
        </div>
      </div>
      <div className="h-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
            <YAxis {...axisProps} width={44} tickFormatter={format} />
            <Tooltip
              {...tooltipStyle}
              formatter={(value: number, name: string) => [
                format(value),
                name === dataKey ? label : `${label} (prev)`,
              ]}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              connectNulls
              activeDot={{ r: 4, fill: color, stroke: '#1e293b', strokeWidth: 2 }}
            />
            {showPrev && prevKey && (
              <Line
                type="monotone"
                dataKey={prevKey}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
                activeDot={{ r: 3, fill: color, stroke: '#1e293b', strokeWidth: 2 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CampaignTrendChart({ campaign, mode }: Props) {
  const [period, setPeriod] = useState<Period>(7);
  const data = buildChartData(campaign.dailyData, period, mode);
  const showPrev = period !== 30;

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
          {showPrev ? `${period}d vs prev ${period}d trend` : '30d trend'}
        </span>
        <div className="flex bg-slate-700/50 rounded-xl p-0.5 border border-slate-600/30">
          {([7, 14, 30] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                period === p
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p === 30 ? '30d' : `${p}v${p}`}
            </button>
          ))}
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mode === 'general' ? (
          <>
            <MiniTrendChart
              data={data}
              dataKey="poas"
              prevKey="poasPrev"
              label="POAS"
              color="#34d399"
              format={v => `${v.toFixed(2)}x`}
              showPrev={showPrev}
            />
            <MiniTrendChart
              data={data}
              dataKey="poas"
              prevKey="poasPrev"
              label="aPOAS"
              color="#a78bfa"
              format={v => `${v.toFixed(2)}x`}
              showPrev={showPrev}
            />
            <MiniTrendChart
              data={data}
              dataKey="spend"
              prevKey="spendPrev"
              label="Spend (€)"
              color="#f472b6"
              format={v => `€${v.toFixed(0)}`}
              showPrev={showPrev}
            />
          </>
        ) : (
          <>
            <MiniTrendChart
              data={data}
              dataKey="revenue"
              prevKey="revenuePrev"
              label="Revenue (€)"
              color="#34d399"
              format={v => `€${v.toFixed(0)}`}
              showPrev={showPrev}
            />
            <MiniTrendChart
              data={data}
              dataKey="cpm"
              prevKey="cpmPrev"
              label="CPM (€)"
              color="#f59e0b"
              format={v => `€${v.toFixed(2)}`}
              showPrev={showPrev}
            />
            <MiniTrendChart
              data={data}
              dataKey="ctr"
              prevKey="ctrPrev"
              label="CTR (%)"
              color="#a78bfa"
              format={v => `${v.toFixed(2)}%`}
              showPrev={showPrev}
            />
            <MiniTrendChart
              data={data}
              dataKey="cpc"
              prevKey="cpcPrev"
              label="CPC (€)"
              color="#60a5fa"
              format={v => `€${v.toFixed(2)}`}
              showPrev={showPrev}
            />
          </>
        )}
      </div>
    </div>
  );
}
