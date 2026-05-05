import { Campaign, DailyDataPoint, PeriodStats } from '../types';

function recalcDay(d: DailyDataPoint) {
  d.ctr    = d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0;
  d.cpc    = d.clicks > 0      ? d.spend / d.clicks : 0;
  d.cpm    = d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0;
  d.roas   = d.spend > 0       ? d.netRevenue   / d.spend : 0;
  d.nkRoas = d.spend > 0       ? d.ncNetRevenue / d.spend : 0;
  d.poas   = d.spend > 0       ? d.cm2          / d.spend : 0;
  d.apoas  = d.spend > 0       ? d.acm2         / d.spend : 0;
}

function emptyPeriod(): PeriodStats {
  return {
    spend: 0, impressions: 0, clicks: 0, conversions: 0,
    grossRevenue: 0, netRevenue: 0, ncNetRevenue: 0, cm2: 0, acm2: 0,
    roas: 0, ctr: 0,
  };
}

function addPeriod(target: PeriodStats, src: PeriodStats) {
  target.spend        += src.spend;
  target.impressions  += src.impressions;
  target.clicks       += src.clicks;
  target.conversions  += src.conversions;
  target.grossRevenue += src.grossRevenue;
  target.netRevenue   += src.netRevenue;
  target.ncNetRevenue += src.ncNetRevenue;
  target.cm2          += src.cm2;
  target.acm2         += src.acm2;
}

function finalizePeriod(p: PeriodStats) {
  p.roas = p.spend > 0       ? p.netRevenue / p.spend : 0;
  p.ctr  = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0;
}

/**
 * Group campaigns by `channelName` and aggregate them into a list of
 * pseudo-campaigns. Daily data is summed by date; derived metrics are
 * recalculated from the aggregated totals.
 */
export function aggregateByChannel(campaigns: Campaign[]): Campaign[] {
  const grouped: Record<string, Campaign[]> = {};
  for (const c of campaigns) {
    (grouped[c.channelName] ??= []).push(c);
  }

  const result: Campaign[] = [];
  for (const channelName of Object.keys(grouped)) {
    const subs = grouped[channelName];

    // Sum dailyData across all sub-campaigns by date
    const byDate: Record<string, DailyDataPoint> = {};
    for (const c of subs) {
      for (const d of c.dailyData) {
        if (!byDate[d.date]) {
          byDate[d.date] = {
            date: d.date,
            spend: 0, impressions: 0, clicks: 0, conversions: 0,
            grossRevenue: 0, netRevenue: 0, ncNetRevenue: 0, cm2: 0, acm2: 0,
            ctr: 0, cpc: 0, cpm: 0, roas: 0, nkRoas: 0, poas: 0, apoas: 0,
          };
        }
        const t = byDate[d.date];
        t.spend        += d.spend;
        t.impressions  += d.impressions;
        t.clicks       += d.clicks;
        t.conversions  += d.conversions;
        t.grossRevenue += d.grossRevenue;
        t.netRevenue   += d.netRevenue;
        t.ncNetRevenue += d.ncNetRevenue;
        t.cm2          += d.cm2;
        t.acm2         += d.acm2;
      }
    }
    const dailyData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    dailyData.forEach(recalcDay);

    // Aggregate period stats
    const current  = emptyPeriod();
    const previous = emptyPeriod();
    for (const c of subs) {
      addPeriod(current,  c.period.current);
      addPeriod(previous, c.period.previous);
    }
    finalizePeriod(current);
    finalizePeriod(previous);

    // Top-level fields (sum of subs)
    let spend = 0, impressions = 0, clicks = 0, conversions = 0;
    let grossRevenue = 0, netRevenue = 0, ncNetRevenue = 0, cm2 = 0, acm2 = 0;
    for (const c of subs) {
      spend += c.spend; impressions += c.impressions; clicks += c.clicks; conversions += c.conversions;
      grossRevenue += c.grossRevenue; netRevenue += c.netRevenue; ncNetRevenue += c.ncNetRevenue;
      cm2 += c.cm2; acm2 += c.acm2;
    }

    result.push({
      id: 'channel:' + channelName,
      name: channelName,
      platform: subs[0].platform,
      channelName,
      spend, impressions, clicks, conversions,
      grossRevenue, netRevenue, ncNetRevenue, cm2, acm2,
      roas: spend > 0       ? netRevenue / spend : 0,
      ctr:  impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc:  clicks > 0      ? spend / clicks : 0,
      cpm:  impressions > 0 ? (spend / impressions) * 1000 : 0,
      dailyData,
      bucket: subs[0].bucket,
      period: { current, previous },
    });
  }

  return result.sort((a, b) => b.spend - a.spend);
}
