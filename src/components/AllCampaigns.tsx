import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Campaign, DateRange } from '../types';
import { getComparisonStats, delta, isActive, RangeResult } from '../lib/comparison';

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmtEuro = (v: number) =>
  '€' + v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPoas = (v: number) => v.toFixed(2);
const fmtCtr  = (v: number) => v.toFixed(2) + '%';
const fmtCpm  = (v: number) => '€' + v.toFixed(2);
const fmtCpc  = (v: number) => '€' + v.toFixed(2);

// ─── Delta bar config ─────────────────────────────────────────────────────────

interface MetricDef {
  label: string;
  current: (s: RangeResult['current']) => number;
  previous: (s: RangeResult['previous']) => number;
  format: (v: number) => string;
  positiveGood: boolean | null; // null = neutral (Spend)
}

const DELTA_METRICS: MetricDef[] = [
  { label: 'Revenue', current: s => s.netRevenue, previous: s => s.netRevenue, format: fmtEuro, positiveGood: true  },
  { label: 'Spend',   current: s => s.spend,      previous: s => s.spend,      format: fmtEuro, positiveGood: null  },
  { label: 'ROAS',    current: s => s.roas,        previous: s => s.roas,       format: fmtPoas, positiveGood: true  },
  { label: 'POAS',    current: s => s.poas,        previous: s => s.poas,       format: fmtPoas, positiveGood: true  },
  { label: 'aPOAS',   current: s => s.apoas,       previous: s => s.apoas,      format: fmtPoas, positiveGood: true  },
  { label: 'CPM',     current: s => s.cpm,         previous: s => s.cpm,        format: fmtCpm,  positiveGood: false },
  { label: 'CPC',     current: s => s.cpc,         previous: s => s.cpc,        format: fmtCpc,  positiveGood: false },
  { label: 'CTR',     current: s => s.ctr,         previous: s => s.ctr,        format: fmtCtr,  positiveGood: true  },
];

// ─── Chart config ─────────────────────────────────────────────────────────────

interface ChartDef {
  label: string;
  key: string;
  prevKey: string;
  color: string;
  format: (v: number) => string;
  yKey: (d: ReturnType<typeof buildChartData>[0]) => number | null;
  yPrevKey: (d: ReturnType<typeof buildChartData>[0]) => number | null;
}

const CHART_ROWS: ChartDef[][] = [
  [
    { label: 'Spend',   key: 'spend',   prevKey: 'prevSpend',   color: '#f472b6', format: fmtEuro, yKey: d => d.spend,   yPrevKey: d => d.prevSpend   },
    { label: 'Revenue', key: 'revenue', prevKey: 'prevRevenue', color: '#34d399', format: fmtEuro, yKey: d => d.revenue, yPrevKey: d => d.prevRevenue },
    { label: 'POAS',    key: 'poas',    prevKey: 'prevPoas',    color: '#a78bfa', format: fmtPoas, yKey: d => d.poas,    yPrevKey: d => d.prevPoas    },
  ],
  [
    { label: 'CPM', key: 'cpm', prevKey: 'prevCpm', color: '#60a5fa', format: fmtCpm, yKey: d => d.cpm, yPrevKey: d => d.prevCpm },
    { label: 'CPC', key: 'cpc', prevKey: 'prevCpc', color: '#fbbf24', format: fmtCpc, yKey: d => d.cpc, yPrevKey: d => d.prevCpc },
    { label: 'CTR', key: 'ctr', prevKey: 'prevCtr', color: '#f87171', format: fmtCtr, yKey: d => d.ctr, yPrevKey: d => d.prevCtr },
  ],
];

// ─── Chart data builder ───────────────────────────────────────────────────────

function buildChartData(result: RangeResult) {
  const { currentDays, previousDays } = result;
  return currentDays.map((day, i) => ({
    label: day.date.slice(5).replace('-', '.'),
    spend:   day.spend,
    revenue: day.grossRevenue,
    poas:    day.poas,
    cpm:     day.cpm,
    cpc:     day.cpc,
    ctr:     day.ctr,
    prevSpend:   previousDays[i]?.spend        ?? null,
    prevRevenue: previousDays[i]?.grossRevenue ?? null,
    prevPoas:    previousDays[i]?.poas    ?? null,
    prevCpm:     previousDays[i]?.cpm     ?? null,
    prevCpc:     previousDays[i]?.cpc     ?? null,
    prevCtr:     previousDays[i]?.ctr     ?? null,
  }));
}

// ─── Platform badge ───────────────────────────────────────────────────────────

const PLATFORM_CLS: Record<string, string> = {
  meta:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  google: 'bg-red-500/20 text-red-400 border-red-500/30',
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border shrink-0 ${PLATFORM_CLS[platform] ?? 'bg-slate-700/50 text-slate-400 border-slate-600/30'}`}>
      {platform}
    </span>
  );
}

// ─── Delta bar ────────────────────────────────────────────────────────────────

function deltaColor(d: number, positiveGood: boolean | null): string {
  if (positiveGood === null) return 'text-slate-400';
  if (d === 0) return 'text-slate-500';
  const good = positiveGood ? d > 0 : d < 0;
  return good ? 'text-emerald-400' : 'text-red-400';
}

function DeltaBar({ result }: { result: RangeResult }) {
  return (
    <div className="flex gap-px overflow-x-auto scrollbar-hide">
      {DELTA_METRICS.map(m => {
        const cur  = m.current(result.current);
        const prev = m.previous(result.previous);
        const d    = delta(cur, prev);
        const sign = d > 0 ? '+' : '';
        const clr  = deltaColor(d, m.positiveGood);
        return (
          <div key={m.label} className="flex-1 min-w-[90px] flex flex-col gap-0.5 px-3 py-2.5 bg-slate-800/60 first:rounded-l-xl last:rounded-r-xl border border-slate-700/40">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{m.label}</span>
            <span className="text-base font-bold text-white leading-tight">{m.format(cur)}</span>
            <span className="text-[11px] text-slate-500">prev {m.format(prev)}</span>
            <span className={`text-[11px] font-semibold ${clr}`}>
              {prev === 0 ? '—' : `${sign}${d.toFixed(1)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Small chart ──────────────────────────────────────────────────────────────

type ChartDataPoint = ReturnType<typeof buildChartData>[0];

function SmallChart({ def, data, hasPrev }: { def: ChartDef; data: ChartDataPoint[]; hasPrev: boolean }) {
  const tooltipStyle = {
    contentStyle: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 },
    labelStyle: { color: '#94a3b8' },
    itemStyle: { color: '#e2e8f0' },
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-slate-300">{def.label}</span>
        {hasPrev && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="inline-block w-4 border-t border-slate-400" />cur
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="inline-block w-4 border-t border-dashed border-slate-600" />prev
            </span>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#475569' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            {...tooltipStyle}
            formatter={(value) => [def.format(typeof value === 'number' ? value : 0)]}
          />
          <Line
            type="monotone"
            dataKey={def.key}
            stroke={def.color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: def.color }}
            connectNulls
          />
          {hasPrev && (
            <Line
              type="monotone"
              dataKey={def.prevKey}
              stroke={def.color}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeOpacity={0.45}
              dot={false}
              activeDot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Easy view ────────────────────────────────────────────────────────────────

function EasyView({ campaign, dateRange }: { campaign: Campaign; dateRange: DateRange }) {
  const result  = getComparisonStats(campaign, dateRange);
  const data    = buildChartData(result);
  const hasPrev = result.previousDays.length > 0;

  return (
    <div className="mt-1 mb-2 ml-4 space-y-4 p-4 bg-slate-800/20 border border-slate-700/30 rounded-xl">
      {/* Delta bar */}
      <DeltaBar result={result} />

      {/* Charts row 1 — Money */}
      <div>
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">Money</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CHART_ROWS[0].map(def => (
            <SmallChart key={def.key} def={def} data={data} hasPrev={hasPrev} />
          ))}
        </div>
      </div>

      {/* Charts row 2 — Diagnose */}
      <div>
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">Diagnose</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CHART_ROWS[1].map(def => (
            <SmallChart key={def.key} def={def} data={data} hasPrev={hasPrev} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Campaign row ─────────────────────────────────────────────────────────────

function CampaignRow({
  campaign,
  dateRange,
  expanded,
  onToggle,
  rowRef,
}: {
  campaign: Campaign;
  dateRange: DateRange;
  expanded: boolean;
  onToggle: () => void;
  rowRef?: React.RefObject<HTMLDivElement>;
}) {
  const result  = getComparisonStats(campaign, dateRange);
  const active  = isActive(campaign);
  const poasDelta = delta(result.current.roas, result.previous.roas);
  const poasSign  = poasDelta > 0 ? '+' : '';
  const poasClr   = poasDelta > 0 ? 'text-emerald-400' : poasDelta < 0 ? 'text-red-400' : 'text-slate-500';

  return (
    <div ref={rowRef}>
      <button
        onClick={onToggle}
        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
          expanded
            ? 'bg-slate-800/70 border-purple-500/30'
            : 'bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/50 hover:border-slate-600/50'
        }`}
      >
        {expanded
          ? <ChevronDown size={14} className="text-purple-400 shrink-0" />
          : <ChevronRight size={14} className="text-slate-500 shrink-0" />
        }

        {/* Status dot */}
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-emerald-400' : 'bg-slate-600'}`} />

        <PlatformBadge platform={campaign.platform} />

        <span className="text-sm font-medium text-slate-200 truncate flex-1 text-left">
          {campaign.name}
        </span>

        {/* Quick stats */}
        <div className="hidden sm:flex items-center gap-5 text-xs shrink-0">
          <div className="text-right">
            <div className="text-slate-400">Spend</div>
            <div className="text-slate-200 font-medium">{fmtEuro(result.current.spend)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">ROAS</div>
            <div className={`font-semibold ${poasClr}`}>
              {fmtPoas(result.current.roas)}
              <span className="text-[10px] ml-1 opacity-80">({poasSign}{poasDelta.toFixed(0)}%)</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">CTR</div>
            <div className="text-slate-200 font-medium">{fmtCtr(result.current.ctr)}</div>
          </div>
        </div>
      </button>

      {expanded && <EasyView campaign={campaign} dateRange={dateRange} />}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  campaigns: Campaign[];
  dateRange: DateRange;
  focusCampaignId: string | null;
}

export function AllCampaigns({ campaigns, dateRange, focusCampaignId }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const rowRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});

  // Ensure refs exist for all campaigns
  campaigns.forEach(c => {
    if (!rowRefs.current[c.id]) {
      rowRefs.current[c.id] = { current: null } as unknown as React.RefObject<HTMLDivElement>;
    }
  });

  // Auto-expand and scroll when focusCampaignId changes
  useEffect(() => {
    if (!focusCampaignId) return;
    setExpandedIds(prev => new Set([...prev, focusCampaignId]));
    setTimeout(() => {
      rowRefs.current[focusCampaignId]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [focusCampaignId]);

  const toggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-base font-semibold text-white">All Campaigns</h2>
        <span className="text-xs text-slate-600">{campaigns.length} campaigns</span>
      </div>

      <div className="space-y-1.5">
        {campaigns.map(c => (
          <CampaignRow
            key={c.id}
            campaign={c}
            dateRange={dateRange}
            expanded={expandedIds.has(c.id)}
            onToggle={() => toggle(c.id)}
            rowRef={rowRefs.current[c.id]}
          />
        ))}
        {campaigns.length === 0 && (
          <p className="text-center text-slate-600 text-sm py-10">No campaigns match the current filters.</p>
        )}
      </div>
    </section>
  );
}
