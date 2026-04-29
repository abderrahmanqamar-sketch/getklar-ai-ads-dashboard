import { useState, useEffect } from 'react';
import { Campaign, Insight, AttributionModel, AttributionWindow, DateBreakdown } from '../types';
import { fetchCampaigns } from '../lib/getklar';
import { generateInsights } from '../lib/gemini';

export function useGetKlar(
  apiKey: string | null,
  model: AttributionModel = 'default',
  attrWindow: AttributionWindow = 'unlimited',
  dateBreakdown: DateBreakdown = 'order',
) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;

    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCampaigns(apiKey, model, attrWindow, dateBreakdown);
        if (!isMounted) return;
        
        // After fetching campaigns, analyze them with Gemini
        const analysis = await generateInsights(data);
        
        // Merge AI statuses into campaigns
        const enrichedCampaigns = data.map(camp => ({
          ...camp,
          aiStatus: analysis.campaignStatuses[camp.id]
        }));

        setCampaigns(enrichedCampaigns);
        setInsights(analysis.insights);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch GetKlar data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; }
  }, [apiKey, model, attrWindow, dateBreakdown]);

  return { campaigns, insights, loading, error };
}
