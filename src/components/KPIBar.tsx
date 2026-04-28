import { Campaign } from '../types';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface KPIBarProps {
  campaigns: Campaign[];
}

export function KPIBar({ campaigns }: KPIBarProps) {
  // Aggregate stats
  const current = campaigns.reduce(
    (acc, camp) => {
      acc.spend += camp.period.current.spend;
      acc.conversions += camp.period.current.conversions;
      acc.revenue += camp.period.current.revenue;
      acc.clicks += camp.period.current.clicks;
      acc.impressions += camp.period.current.impressions;
      return acc;
    },
    { spend: 0, conversions: 0, revenue: 0, clicks: 0, impressions: 0 }
  );

  const previous = campaigns.reduce(
    (acc, camp) => {
      acc.spend += camp.period.previous.spend;
      acc.conversions += camp.period.previous.conversions;
      acc.revenue += camp.period.previous.revenue;
      acc.clicks += camp.period.previous.clicks;
      acc.impressions += camp.period.previous.impressions;
      return acc;
    },
    { spend: 0, conversions: 0, revenue: 0, clicks: 0, impressions: 0 }
  );

  const currentROAS = current.spend > 0 ? current.revenue / current.spend : 0;
  const previousROAS = previous.spend > 0 ? previous.revenue / previous.spend : 0;
  
  const currentCTR = current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0;
  const previousCTR = previous.impressions > 0 ? (previous.clicks / previous.impressions) * 100 : 0;

  const kpis = [
    {
      label: 'Total Spend',
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(current.spend),
      // Lower spend isn't necessarily good or bad, but typically treated as neutral or compared against target. Let's make it neutral or use standard diff.
      trend: current.spend > previous.spend ? 1 : current.spend < previous.spend ? -1 : 0,
      diff: Math.abs(current.spend - previous.spend) / (previous.spend || 1) * 100,
      format: (v: number) => `£${v.toFixed(0)}`
    },
    {
      label: 'ROAS',
      value: currentROAS.toFixed(2),
      trend: currentROAS > previousROAS ? 1 : currentROAS < previousROAS ? -1 : 0,
      diff: Math.abs(currentROAS - previousROAS) / (previousROAS || 1) * 100,
    },
    {
      label: 'CTR',
      value: `${currentCTR.toFixed(2)}%`,
      trend: currentCTR > previousCTR ? 1 : currentCTR < previousCTR ? -1 : 0,
      diff: Math.abs(currentCTR - previousCTR) / (previousCTR || 1) * 100,
    },
    {
      label: 'Total Conversions',
      value: current.conversions.toLocaleString(),
      trend: current.conversions > previous.conversions ? 1 : current.conversions < previous.conversions ? -1 : 0,
      diff: Math.abs(current.conversions - previous.conversions) / (previous.conversions || 1) * 100,
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-slate-400 text-sm font-medium mb-1">{kpi.label}</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-white">{kpi.value}</h3>
            
            <div className={`flex items-center text-sm font-medium ${
              kpi.trend > 0 ? 'text-emerald-400' : kpi.trend < 0 ? 'text-rose-400' : 'text-slate-500'
            }`}>
              {kpi.trend > 0 ? <ArrowUpRight size={16} className="mr-1" /> : 
               kpi.trend < 0 ? <ArrowDownRight size={16} className="mr-1" /> : 
               <Minus size={16} className="mr-1" />}
              <span>{kpi.diff.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
