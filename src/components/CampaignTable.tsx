import { useState } from 'react';
import { Campaign } from '../types';
import { ArrowUpDown, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface CampaignTableProps {
  campaigns: Campaign[];
}

type SortField = 'name' | 'spend' | 'roas' | 'ctr' | 'conversions';

export function CampaignTable({ campaigns }: CampaignTableProps) {
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to desc for new field
    }
  };

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    let aVal = 0;
    let bVal = 0;

    switch (sortField) {
      case 'name':
        aVal = a.name.localeCompare(b.name) as any;
        bVal = 0; // handled differently
        break;
      case 'spend':
        aVal = a.period.current.spend;
        bVal = b.period.current.spend;
        break;
      case 'roas':
        aVal = a.period.current.roas;
        bVal = b.period.current.roas;
        break;
      case 'ctr':
        aVal = a.period.current.ctr;
        bVal = b.period.current.ctr;
        break;
      case 'conversions':
        aVal = a.period.current.conversions;
        bVal = b.period.current.conversions;
        break;
    }

    if (sortField === 'name') {
      return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }

    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUpRight size={18} className="text-emerald-400" />;
    if (current < previous) return <ArrowDownRight size={18} className="text-rose-400" />;
    return <Minus size={18} className="text-slate-500" />;
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <span className="text-slate-500">Evaluating...</span>;
    
    let colorClass = 'bg-slate-700/50 text-slate-300';
    if (status.includes('Performing') && !status.includes('Under')) {
      colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    } else if (status.includes('Watch')) {
      colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    } else if (status.includes('Underperforming')) {
      colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }

    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${colorClass}`}>
        {status}
      </span>
    );
  };

  const Th = ({ label, field, right }: { label: string, field: SortField, right?: boolean }) => (
    <th 
      onClick={() => handleSort(field)}
      className={`px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors ${right ? 'text-right' : 'text-left'}`}
    >
      <div className={`flex items-center gap-1 ${right ? 'justify-end' : ''}`}>
        {label}
        {sortField === field ? (
          <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        ) : (
           <ArrowUpDown size={12} className="opacity-50" />
        )}
      </div>
    </th>
  );

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
      <div className="px-6 py-5 border-b border-slate-700 bg-slate-800/50">
        <h2 className="text-lg font-bold text-white">Campaign Performance</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead className="bg-slate-800/80 border-b border-slate-700">
            <tr>
              <Th label="Campaign Name" field="name" />
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <Th label="Spend" field="spend" right />
              <Th label="ROAS" field="roas" right />
              <Th label="CTR" field="ctr" right />
              <Th label="Conversions" field="conversions" right />
              <th className="px-4 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Trend (ROAS)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {sortedCampaigns.map((camp) => (
              <tr key={camp.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-white">{camp.name}</div>
                </td>
                <td className="px-4 py-4">
                  {getStatusBadge(camp.aiStatus)}
                </td>
                <td className="px-4 py-4 text-right text-sm text-slate-300">
                  ${camp.period.current.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-4 text-right">
                  <span className={`text-sm font-medium ${camp.period.current.roas >= 2 ? 'text-emerald-400' : camp.period.current.roas < 1.5 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {camp.period.current.roas.toFixed(2)}x
                  </span>
                </td>
                <td className="px-4 py-4 text-right text-sm text-slate-300">
                  {camp.period.current.ctr.toFixed(2)}%
                </td>
                <td className="px-4 py-4 text-right text-sm text-slate-300">
                  {camp.period.current.conversions.toLocaleString()}
                </td>
                <td className="px-4 py-4 flex justify-center mt-1">
                  {getTrendIcon(camp.period.current.roas, camp.period.previous.roas)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
