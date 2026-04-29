import { Campaign, DailyDataPoint, BucketType } from '../types';

// Store token in memory locally to avoid re-fetching on every component mount
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;

async function getAccessToken(refreshToken: string): Promise<string> {
  // Use cached token if valid (give a 1 minute buffer)
  if (cachedAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const response = await fetch('https://api.getklar.com/public/auth/token', {
    method: 'POST',
    headers: {
      'token': refreshToken
    }
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate with GetKlar API. Please check your Refresh Token.');
  }

  const data = await response.json();
  cachedAccessToken = data.accessToken;
  tokenExpiresAt = Date.now() + (data.expiresIn || 300000);

  return data.accessToken;
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

// Rate-limited fetch: the API enforces 2 requests per 30 seconds
// We space out requests to stay safe
async function rateLimitedFetch(url: string, headers: Record<string, string>): Promise<any> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch attribution data: ${response.statusText}`);
  }
  return response.json();
}

async function fetchAttributionPeriod(accessToken: string, startDate: Date, endDate: Date): Promise<any[]> {
  const url = new URL('https://api.getklar.com/public/attribution');
  url.searchParams.append('startDate', formatDate(startDate));
  url.searchParams.append('endDate', formatDate(endDate));

  return rateLimitedFetch(url.toString(), { 'Authorization': `Bearer ${accessToken}` });
}

/**
 * Classify a campaign into a bucket based on its name.
 */
function classifyCampaign(name: string): BucketType {
  const lower = name.toLowerCase();

  // Switzerland campaigns
  if (lower.includes('schweiz') || lower.includes('switzerland') || lower.includes('swiss') || lower.includes(' ch ') || lower.includes('_ch_') || lower.endsWith(' ch') || lower.endsWith('_ch')) {
    return 'switzerland';
  }

  // Retention / BOFU campaigns
  if (lower.includes('retention') || lower.includes('bofu') || lower.includes('bestandskunde')) {
    return 'retention';
  }

  // Branding campaigns
  if (lower.includes('branding') || lower.includes('brand awareness')) {
    return 'branding';
  }

  // Everything else is new customer acquisition
  return 'newcustomer';
}

/**
 * Build daily data points per campaign from raw API rows.
 * Each raw row has: campaignId, campaignName, date, cost, impressions, clicks, orders, netRevenue, etc.
 */
function normalizePlatform(row: any): string {
  // GetKlar API may expose the channel via different field names
  const raw = (row.platform || row.channel || row.adNetwork || row.source || '').toLowerCase();
  if (raw.includes('google') || raw.includes('gads') || raw.includes('adwords')) return 'google';
  if (raw.includes('meta') || raw.includes('facebook') || raw.includes('instagram')) return 'meta';
  if (raw.includes('tiktok')) return 'tiktok';
  if (raw.includes('pinterest')) return 'pinterest';
  if (raw) return raw;
  // Fallback: infer from campaign name
  const name = (row.campaignName || '').toLowerCase();
  if (name.includes('google') || name.includes('pmax') || name.includes('search') || name.includes('shopping')) return 'google';
  if (name.includes('meta') || name.includes('facebook') || name.includes('fb_') || name.includes('instagram')) return 'meta';
  return 'unknown';
}

function buildDailyData(rows: any[]): Record<string, { name: string; platform: string; dailyMap: Record<string, DailyDataPoint> }> {
  const campaigns: Record<string, { name: string; platform: string; dailyMap: Record<string, DailyDataPoint> }> = {};

  for (const row of rows) {
    const id = String(row.campaignId || 'unknown');
    if (id === 'unknown') continue;

    if (!campaigns[id]) {
      campaigns[id] = {
        name: row.campaignName || 'Unknown Campaign',
        platform: normalizePlatform(row),
        dailyMap: {},
      };
    } else if (campaigns[id].platform === 'unknown') {
      // Refine platform if we get better info from a later row
      const p = normalizePlatform(row);
      if (p !== 'unknown') campaigns[id].platform = p;
    }

    const date = row.date;
    if (!campaigns[id].dailyMap[date]) {
      campaigns[id].dailyMap[date] = {
        date,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        poas: 0,
      };
    }

    const dp = campaigns[id].dailyMap[date];
    dp.spend += row.cost || 0;
    dp.impressions += row.impressions || 0;
    dp.clicks += row.clicks || 0;
    dp.conversions += row.orders || 0;
    dp.revenue += row.netRevenue || 0;
  }

  // Calculate derived metrics per day
  for (const campId of Object.keys(campaigns)) {
    for (const date of Object.keys(campaigns[campId].dailyMap)) {
      const dp = campaigns[campId].dailyMap[date];
      dp.ctr = dp.impressions > 0 ? (dp.clicks / dp.impressions) * 100 : 0;
      dp.cpc = dp.clicks > 0 ? dp.spend / dp.clicks : 0;
      dp.cpm = dp.impressions > 0 ? (dp.spend / dp.impressions) * 1000 : 0;
      dp.poas = dp.spend > 0 ? dp.revenue / dp.spend : 0;
    }
  }

  return campaigns;
}

function aggregateStats(dailyPoints: DailyDataPoint[]) {
  const agg = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
  for (const dp of dailyPoints) {
    agg.spend += dp.spend;
    agg.impressions += dp.impressions;
    agg.clicks += dp.clicks;
    agg.conversions += dp.conversions;
    agg.revenue += dp.revenue;
  }
  return {
    ...agg,
    roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
    ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
    cpc: agg.clicks > 0 ? agg.spend / agg.clicks : 0,
    cpm: agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0,
  };
}

export async function fetchCampaigns(refreshToken: string): Promise<Campaign[]> {
  if (!refreshToken) {
    throw new Error('GetKlar API Refresh Token is required');
  }

  const accessToken = await getAccessToken(refreshToken);

  // We need 60 days of data: last 30 days (current) + 30 days before (previous)
  // API allows max 31 days per request, so we make 2 requests
  const today = new Date();

  const currentEndDate = new Date(today);
  const currentStartDate = new Date(today);
  currentStartDate.setDate(currentStartDate.getDate() - 30);

  const prevEndDate = new Date(currentStartDate);
  const prevStartDate = new Date(currentStartDate);
  prevStartDate.setDate(prevStartDate.getDate() - 30);

  // Rate limit: 2 requests per 30 seconds
  // Auth counted as request #1, so we can do one attribution call right away
  const currentRaw = await fetchAttributionPeriod(accessToken, currentStartDate, currentEndDate);

  // Wait 16 seconds before the second attribution request to respect rate limit
  await new Promise(resolve => setTimeout(resolve, 16000));

  const prevRaw = await fetchAttributionPeriod(accessToken, prevStartDate, prevEndDate);

  // Build daily data from current period
  const currentDaily = buildDailyData(currentRaw);
  const prevDaily = buildDailyData(prevRaw);

  // Merge into Campaign[]
  const allIds = new Set([...Object.keys(currentDaily), ...Object.keys(prevDaily)]);
  const campaigns: Campaign[] = [];

  for (const id of allIds) {
    const currCamp = currentDaily[id];
    const prevCamp = prevDaily[id];
    const name = currCamp?.name || prevCamp?.name || 'Unknown';

    // Daily data points sorted by date
    const dailyData = currCamp
      ? Object.values(currCamp.dailyMap).sort((a, b) => a.date.localeCompare(b.date))
      : [];

    const prevPoints = prevCamp
      ? Object.values(prevCamp.dailyMap)
      : [];

    const currStats = aggregateStats(dailyData);
    const prevStats = aggregateStats(prevPoints);

    const platform = currCamp?.platform || prevCamp?.platform || 'unknown';

    campaigns.push({
      id,
      name,
      platform,
      spend: currStats.spend,
      impressions: currStats.impressions,
      clicks: currStats.clicks,
      conversions: currStats.conversions,
      revenue: currStats.revenue,
      roas: currStats.roas,
      ctr: currStats.ctr,
      cpc: currStats.cpc,
      cpm: currStats.cpm,
      dailyData,
      bucket: classifyCampaign(name),
      period: {
        current: {
          spend: currStats.spend, impressions: currStats.impressions, clicks: currStats.clicks,
          conversions: currStats.conversions, revenue: currStats.revenue, roas: currStats.roas, ctr: currStats.ctr
        },
        previous: {
          spend: prevStats.spend, impressions: prevStats.impressions, clicks: prevStats.clicks,
          conversions: prevStats.conversions, revenue: prevStats.revenue, roas: prevStats.roas, ctr: prevStats.ctr
        }
      }
    });
  }

  return campaigns.sort((a, b) => b.spend - a.spend);
}
