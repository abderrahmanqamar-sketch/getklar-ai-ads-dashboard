import { Campaign, DateRange, DailyDataPoint } from '../types';

export interface ComparisonStats {
  spend: number;
  grossRevenue: number;
  netRevenue: number;
  poas: number;  // grossRevenue / spend
  apoas: number; // netRevenue  / spend
  ctr: number;
  cpc: number;
  cpm: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

function aggregate(points: DailyDataPoint[]): ComparisonStats {
  let spend = 0, grossRevenue = 0, netRevenue = 0, impressions = 0, clicks = 0, conversions = 0;
  for (const p of points) {
    spend        += p.spend;
    grossRevenue += p.grossRevenue;
    netRevenue   += p.netRevenue;
    impressions  += p.impressions;
    clicks       += p.clicks;
    conversions  += p.conversions;
  }
  return {
    spend, grossRevenue, netRevenue, impressions, clicks, conversions,
    poas:  spend > 0       ? grossRevenue / spend : 0,
    apoas: spend > 0       ? netRevenue   / spend : 0,
    ctr:   impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc:   clicks > 0      ? spend / clicks : 0,
    cpm:   impressions > 0 ? (spend / impressions) * 1000 : 0,
  };
}

export interface RangeResult {
  current: ComparisonStats;
  previous: ComparisonStats;
  currentDays: DailyDataPoint[];
  previousDays: DailyDataPoint[];
}

function generateDates(endDate: string, n: number): string[] {
  const dates: string[] = [];
  const end = new Date(endDate + 'T00:00:00Z');
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function emptyDay(date: string): DailyDataPoint {
  return { date, spend: 0, grossRevenue: 0, netRevenue: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, cpm: 0, poas: 0, apoas: 0 };
}

export function getComparisonStats(campaign: Campaign, range: DateRange): RangeResult {
  const sorted = [...campaign.dailyData].sort((a, b) => a.date.localeCompare(b.date));
  const dailyMap = Object.fromEntries(sorted.map(d => [d.date, d]));

  const lastDate = sorted[sorted.length - 1]?.date;
  if (!lastDate) {
    const empty = aggregate([]);
    return { current: empty, previous: empty, currentDays: [], previousDays: [] };
  }

  if (range === '7v7' || range === '14v14') {
    const n = range === '7v7' ? 7 : 14;
    const currentDates  = generateDates(lastDate, n);
    // Previous period ends the day before current starts
    const prevEnd = new Date(currentDates[0] + 'T00:00:00Z');
    prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
    const previousDates = generateDates(prevEnd.toISOString().split('T')[0], n);

    const currentDays  = currentDates.map(d => dailyMap[d] ?? emptyDay(d));
    const previousDays = previousDates.map(d => dailyMap[d] ?? emptyDay(d));

    return { current: aggregate(currentDays), previous: aggregate(previousDays), currentDays, previousDays };
  }

  // 30d — current from dailyData, previous from pre-fetched period
  const currentDays = generateDates(lastDate, 30).map(d => dailyMap[d] ?? emptyDay(d));
  const prev = campaign.period.previous;
  return {
    current: aggregate(currentDays),
    previous: {
      spend:        prev.spend,
      grossRevenue: prev.grossRevenue,
      netRevenue:   prev.netRevenue,
      impressions:  prev.impressions,
      clicks:       prev.clicks,
      conversions:  prev.conversions,
      poas:         prev.roas,
      apoas:        prev.spend > 0 ? prev.netRevenue / prev.spend : 0,
      ctr:          prev.ctr,
      cpc:          prev.clicks > 0      ? prev.spend / prev.clicks : 0,
      cpm:          prev.impressions > 0 ? (prev.spend / prev.impressions) * 1000 : 0,
    },
    currentDays,
    previousDays: [],
  };
}

export function isActive(campaign: Campaign): boolean {
  const sorted = [...campaign.dailyData].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-7).some(d => d.spend > 0);
}

export function delta(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
