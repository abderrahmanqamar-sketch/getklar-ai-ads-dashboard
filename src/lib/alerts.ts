import { Campaign, DateRange } from '../types';
import { getComparisonStats, delta } from './comparison';

export type AlertLevel = 'red' | 'orange';

export interface MetricAlert {
  metric: string;
  level: AlertLevel;
  deltaPercent: number;
  label: string;
}

export interface CampaignAlert {
  campaign: Campaign;
  alerts: MetricAlert[];
  worstLevel: AlertLevel;
}

interface Thresholds {
  poasOrange: number;
  poasRed: number;
  revenueOrange: number;
  revenueRed: number;
  spendOrange: number;
  spendRed: number;
  diagOrange: number;
  diagRed: number;
}

function getThresholds(range: DateRange): Thresholds {
  const strict = range !== '7v7';
  return {
    poasOrange:    strict ? 5  : 10,
    poasRed:       strict ? 10 : 15,
    revenueOrange: strict ? 10 : 15,
    revenueRed:    strict ? 15 : 20,
    spendOrange:   strict ? 15 : 20,
    spendRed:      strict ? 25 : 30,
    diagOrange:    strict ? 15 : 20,
    diagRed:       strict ? 20 : 25,
  };
}

type Direction = 'negative-bad' | 'positive-bad' | 'both-bad';

function check(
  metric: string,
  d: number,
  orange: number,
  red: number,
  dir: Direction
): MetricAlert | null {
  let level: AlertLevel | null = null;

  if (dir === 'negative-bad') {
    if (d < -red) level = 'red';
    else if (d < -orange) level = 'orange';
  } else if (dir === 'positive-bad') {
    if (d > red) level = 'red';
    else if (d > orange) level = 'orange';
  } else {
    if (Math.abs(d) > red) level = 'red';
    else if (Math.abs(d) > orange) level = 'orange';
  }

  if (!level) return null;
  const sign = d > 0 ? '+' : '';
  return { metric, level, deltaPercent: d, label: `${metric} ${sign}${Math.round(d)}%` };
}

export function computeAlerts(campaign: Campaign, range: DateRange): MetricAlert[] {
  const { current, previous } = getComparisonStats(campaign, range);
  const t = getThresholds(range);
  const alerts: MetricAlert[] = [];

  const add = (a: MetricAlert | null) => { if (a) alerts.push(a); };

  add(check('POAS',    delta(current.poas,         previous.poas),         t.poasOrange,    t.poasRed,    'negative-bad'));
  add(check('aPOAS',   delta(current.apoas,        previous.apoas),        t.poasOrange,    t.poasRed,    'negative-bad'));
  add(check('Revenue', delta(current.grossRevenue, previous.grossRevenue), t.revenueOrange, t.revenueRed, 'negative-bad'));
  add(check('Spend',   delta(current.spend,   previous.spend),   t.spendOrange,   t.spendRed,   'both-bad'));
  add(check('CPM',     delta(current.cpm,     previous.cpm),     t.diagOrange,    t.diagRed,    'positive-bad'));
  add(check('CPC',     delta(current.cpc,     previous.cpc),     t.diagOrange,    t.diagRed,    'positive-bad'));
  add(check('CTR',     delta(current.ctr,     previous.ctr),     t.diagOrange,    t.diagRed,    'negative-bad'));

  // Reds first, then oranges; within each group sort by worst delta
  return alerts.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'red' ? -1 : 1;
    return Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent);
  });
}

export function computeAllAlerts(campaigns: Campaign[], range: DateRange): CampaignAlert[] {
  const result: CampaignAlert[] = [];

  for (const campaign of campaigns) {
    const alerts = computeAlerts(campaign, range);
    if (alerts.length === 0) continue;
    const worstLevel: AlertLevel = alerts.some(a => a.level === 'red') ? 'red' : 'orange';
    result.push({ campaign, alerts, worstLevel });
  }

  // Red campaigns first, then orange; within each group by worst delta magnitude
  return result.sort((a, b) => {
    if (a.worstLevel !== b.worstLevel) return a.worstLevel === 'red' ? -1 : 1;
    const aWorst = Math.abs(a.alerts[0]?.deltaPercent ?? 0);
    const bWorst = Math.abs(b.alerts[0]?.deltaPercent ?? 0);
    return bWorst - aWorst;
  });
}
