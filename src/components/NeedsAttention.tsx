import { Campaign, DateRange } from '../types';
import { computeAllAlerts, CampaignAlert, MetricAlert } from '../lib/alerts';

interface Props {
  campaigns: Campaign[];
  dateRange: DateRange;
  onSelect: (campaignId: string) => void;
}

const PLATFORM_BADGE: Record<string, string> = {
  meta:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  google:  'bg-red-500/20 text-red-400 border-red-500/30',
  tiktok:  'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

function PlatformBadge({ platform }: { platform: string }) {
  const cls = PLATFORM_BADGE[platform] ?? 'bg-slate-700/50 text-slate-400 border-slate-600/30';
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border shrink-0 ${cls}`}>
      {platform}
    </span>
  );
}

function AlertBadge({ alert }: { alert: MetricAlert }) {
  const isRed = alert.level === 'red';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border ${
      isRed
        ? 'bg-red-500/15 text-red-400 border-red-500/30'
        : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRed ? 'bg-red-500' : 'bg-orange-400'}`} />
      {alert.label}
    </span>
  );
}

function AlertCard({ item, onSelect }: { item: CampaignAlert; onSelect: () => void }) {
  const isRed = item.worstLevel === 'red';
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all hover:brightness-110 active:scale-[0.99] ${
        isRed
          ? 'bg-red-950/30 border-red-500/25 hover:border-red-500/40'
          : 'bg-orange-950/20 border-orange-500/20 hover:border-orange-500/35'
      }`}
    >
      {/* Severity bar */}
      <div className={`w-0.5 self-stretch rounded-full shrink-0 mt-0.5 ${isRed ? 'bg-red-500' : 'bg-orange-400'}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <PlatformBadge platform={item.campaign.platform} />
          <span className="text-sm font-medium text-slate-200 truncate">
            {item.campaign.name}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {item.alerts.map(alert => (
            <AlertBadge key={alert.metric} alert={alert} />
          ))}
        </div>
      </div>
    </button>
  );
}

export function NeedsAttention({ campaigns, dateRange, onSelect }: Props) {
  const flagged = computeAllAlerts(campaigns, dateRange);
  const redCount = flagged.filter(f => f.worstLevel === 'red').length;
  const orangeCount = flagged.filter(f => f.worstLevel === 'orange').length;

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-base font-semibold text-white">Needs Attention</h2>
        {flagged.length === 0 ? (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
            ✓ All clear
          </span>
        ) : (
          <div className="flex gap-1.5">
            {redCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{redCount}
              </span>
            )}
            {orangeCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />{orangeCount}
              </span>
            )}
          </div>
        )}
      </div>

      {flagged.length === 0 ? (
        <div className="text-center py-8 text-slate-600 text-sm">
          No campaigns outside thresholds for this period.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {flagged.map(item => (
            <AlertCard
              key={item.campaign.id}
              item={item}
              onSelect={() => onSelect(item.campaign.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
