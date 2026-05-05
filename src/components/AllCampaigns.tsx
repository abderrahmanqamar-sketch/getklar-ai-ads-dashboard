import { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Campaign, DateRange } from '../types';
import { getComparisonStats, delta, isActive, RangeResult } from '../lib/comparison';
import { aggregateByChannel } from '../lib/channels';

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmtEuro = (v: number) =>
  '€' + v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPoas = (v: number) => v.toFixed(2);
const fmtCtr  = (v: number) => v.toFixed(2) + '%';
const fmtCpm  = (v: number) => '€' + v.toFixed(2);
const fmtCpc  = (v: number) => '€' + v.toFixed(2);

// Compact axis formatters
const axEuro = (v: number) => Math.abs(v) >= 1000 ? `€${(v / 1000).toFixed(1)}k` : `€${Math.round(v)}`;
const axPoas = (v: number) => v.toFixed(2);
const axCpm  = (v: number) => `€${v.toFixed(0)}`;
const axCpc  = (v: number) => `€${v.toFixed(2)}`;
const axCtr  = (v: number) => `${v.toFixed(1)}%`;

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
  axisFormat: (v: number) => string;
  references?: number[]; // horizontal reference lines for orientation
}

const CHART_ROWS: ChartDef[][] = [
  [
    { label: 'Spend', key: 'spend', prevKey: 'prevSpend', color: '#f472b6', format: fmtEuro, axisFormat: axEuro },
    { label: 'POAS',  key: 'poas',  prevKey: 'prevPoas',  color: '#a78bfa', format: fmtPoas, axisFormat: axPoas, references: [0.3, 0.6] },
    { label: 'aPOAS', key: 'apoas', prevKey: 'prevApoas', color: '#34d399', format: fmtPoas, axisFormat: axPoas, references: [0.3, 0.6] },
  ],
  [
    { label: 'CPM', key: 'cpm', prevKey: 'prevCpm', color: '#60a5fa', format: fmtCpm, axisFormat: axCpm },
    { label: 'CPC', key: 'cpc', prevKey: 'prevCpc', color: '#fbbf24', format: fmtCpc, axisFormat: axCpc },
    { label: 'CTR', key: 'ctr', prevKey: 'prevCtr', color: '#f87171', format: fmtCtr, axisFormat: axCtr, references: [1.0, 2.0] },
  ],
];

// ─── Chart data builder ───────────────────────────────────────────────────────

function fmtDate(date: string) {
  return date.slice(5).replace('-', '.');
}

function buildChartData(result: RangeResult) {
  const { currentDays, previousDays } = result;
  return currentDays.map((day, i) => {
    const prev = previousDays[i];
    return {
      label:     fmtDate(day.date),
      prevLabel: prev ? fmtDate(prev.date) : null,
      spend: day.spend,
      poas:  day.poas,
      apoas: day.apoas,
      cpm:   day.cpm,
      cpc:   day.cpc,
      ctr:   day.ctr,
      prevSpend: prev?.spend ?? null,
      prevPoas:  prev?.poas  ?? null,
      prevApoas: prev?.apoas ?? null,
      prevCpm:   prev?.cpm   ?? null,
      prevCpc:   prev?.cpc   ?? null,
      prevCtr:   prev?.ctr   ?? null,
    };
  });
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

function ChartTooltip({ active, payload, label, def, hasPrev }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as ChartDataPoint;
  const cur  = (data as any)[def.key];
  const prev = (data as any)[def.prevKey];
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-md px-2.5 py-1.5 text-[11px] shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-0.5" style={{ backgroundColor: def.color }} />
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-100 font-medium ml-auto">
          {cur != null ? def.format(cur) : '—'}
        </span>
      </div>
      {hasPrev && data.prevLabel && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="inline-block w-3 h-px border-t border-dashed" style={{ borderColor: def.color, opacity: 0.6 }} />
          <span className="text-slate-500">{data.prevLabel}</span>
          <span className="text-slate-300 ml-auto">
            {prev != null ? def.format(prev) : '—'}
          </span>
        </div>
      )}
    </div>
  );
}

function SmallChart({ def, data, hasPrev }: { def: ChartDef; data: ChartDataPoint[]; hasPrev: boolean }) {
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
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: def.references ? 32 : 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={def.axisFormat}
            width={42}
            domain={['auto', 'auto']}
          />
          <Tooltip
            content={(props: any) => <ChartTooltip {...props} def={def} hasPrev={hasPrev} />}
            cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          {def.references?.map(v => (
            <ReferenceLine
              key={v}
              y={v}
              stroke="#cbd5e1"
              strokeDasharray="4 3"
              strokeOpacity={0.55}
              strokeWidth={1.25}
              label={{
                value: def.axisFormat(v),
                position: 'right',
                fill: '#cbd5e1',
                fontSize: 9,
                fontWeight: 600,
              }}
            />
          ))}
          <Line
            type="monotone"
            dataKey={def.key}
            stroke={def.color}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3.5, fill: def.color, stroke: '#0f172a', strokeWidth: 1.5 }}
            connectNulls
          />
          {hasPrev && (
            <Line
              type="monotone"
              dataKey={def.prevKey}
              stroke={def.color}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeOpacity={0.4}
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
  isChannel = false,
}: {
  campaign: Campaign;
  dateRange: DateRange;
  expanded: boolean;
  onToggle: () => void;
  rowRef?: React.RefObject<HTMLDivElement>;
  isChannel?: boolean;
}) {
  const result  = getComparisonStats(campaign, dateRange);
  const active  = isActive(campaign);

  const deltaInfo = (cur: number, prev: number) => {
    const d = delta(cur, prev);
    return {
      sign: d > 0 ? '+' : '',
      pct: d.toFixed(0),
      clr: d > 0 ? 'text-emerald-400' : d < 0 ? 'text-red-400' : 'text-slate-500',
    };
  };

  const roasInfo   = deltaInfo(result.current.roas,   result.previous.roas);
  const apoasInfo  = deltaInfo(result.current.apoas,  result.previous.apoas);
  const nkRoasInfo = deltaInfo(result.current.nkRoas, result.previous.nkRoas);

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

        {!isChannel && <PlatformBadge platform={campaign.platform} />}

        <span className={`text-sm font-medium truncate flex-1 text-left ${isChannel ? 'text-white' : 'text-slate-200'}`}>
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
            <div className={`font-semibold ${roasInfo.clr}`}>
              {fmtPoas(result.current.roas)}
              <span className="text-[10px] ml-1 opacity-80">({roasInfo.sign}{roasInfo.pct}%)</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">aPOAS</div>
            <div className={`font-semibold ${apoasInfo.clr}`}>
              {fmtPoas(result.current.apoas)}
              <span className="text-[10px] ml-1 opacity-80">({apoasInfo.sign}{apoasInfo.pct}%)</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">NK ROAS</div>
            <div className={`font-semibold ${nkRoasInfo.clr}`}>
              {fmtPoas(result.current.nkRoas)}
              <span className="text-[10px] ml-1 opacity-80">({nkRoasInfo.sign}{nkRoasInfo.pct}%)</span>
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

type View = 'campaigns' | 'channels';

export function AllCampaigns({ campaigns, dateRange, focusCampaignId }: Props) {
  const [view, setView] = useState<View>('campaigns');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const rowRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});

  const channels = useMemo(() => aggregateByChannel(campaigns), [campaigns]);
  const items = view === 'campaigns' ? campaigns : channels;

  // Ensure refs exist for all items
  items.forEach(c => {
    if (!rowRefs.current[c.id]) {
      rowRefs.current[c.id] = { current: null } as unknown as React.RefObject<HTMLDivElement>;
    }
  });

  // Auto-expand and scroll when focusCampaignId changes; switch to campaigns view
  useEffect(() => {
    if (!focusCampaignId) return;
    setView('campaigns');
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

  const isChannels = view === 'channels';

  return (
    <section>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <h2 className="text-base font-semibold text-white">
          All {isChannels ? 'Channels' : 'Campaigns'}
        </h2>
        <span className="text-xs text-slate-600">
          {items.length} {isChannels ? 'channels' : 'campaigns'}
        </span>

        {/* View toggle */}
        <div className="ml-auto flex bg-slate-800 rounded-lg p-0.5 border border-slate-700/60 gap-0.5">
          <button
            onClick={() => setView('campaigns')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              view === 'campaigns' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setView('channels')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              view === 'channels' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Channels
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {items.map(c => (
          <CampaignRow
            key={c.id}
            campaign={c}
            dateRange={dateRange}
            expanded={expandedIds.has(c.id)}
            onToggle={() => toggle(c.id)}
            rowRef={rowRefs.current[c.id]}
            isChannel={isChannels}
          />
        ))}
        {items.length === 0 && (
          <p className="text-center text-slate-600 text-sm py-10">
            No {isChannels ? 'channels' : 'campaigns'} match the current filters.
          </p>
        )}
      </div>
    </section>
  );
}
