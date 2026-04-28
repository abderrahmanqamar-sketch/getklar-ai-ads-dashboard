import { GoogleGenerativeAI } from '@google/generative-ai';
import { Campaign, Insight } from '../types';

// For this project, you would normally keep the Gemini API key in an env variable
// Since this is a client side application, in a real production app it should call a backend.
// We will assume window.env or similar has it, or we can use a mock mode if missing.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateInsights(campaigns: Campaign[]): Promise<{
    insights: Insight[];
    campaignStatuses: Record<string, '🟢 Performing' | '🟡 Watch' | '🔴 Underperforming'>;
  }> {
  // If no realistic API key, we mock the insights too to allow testing the UI.
  if (!API_KEY) {
    return generateMockInsights(campaigns);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  const prompt = `
    Analyze the following ad campaigns data and provide:
    1. 3 key insights (mix of potentials, improvements, and deteriorations).
    2. A status for each campaign ID (Performing, Watch, or Underperforming).

    Format your response EXACTLY as this JSON:
    {
      "insights": [
        { "id": "1", "type": "💡 Potential", "message": "insight here", "campaignId": "optional_id" }
      ],
      "campaignStatuses": {
        "c1": "🟢 Performing"
      }
    }

    Data:
    ${JSON.stringify(campaigns, null, 2)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    // Parse JSON out of markdown block if necessary
    const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Gemini Insights Error:", err);
    return generateMockInsights(campaigns);
  }
}

export async function askQuestion(question: string, history: any[], campaigns: Campaign[]) {
  if (!API_KEY) {
      await new Promise(r => setTimeout(r, 1000));
      return "This is a mock response because VITE_GEMINI_API_KEY is not set. Setup Gemini key in .env to enable real AI chat.";
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  
  // Create chat session with context
  const chatContext = `You are a GetKlar dashboard AI assistant. Use the following campaign data to answer user questions:
  ${JSON.stringify(campaigns, null, 2)}`;
  
  try {
      const result = await model.generateContent(`Context: ${chatContext}\n\nHistory: ${JSON.stringify(history)}\n\nQuestion: ${question}`);
      return result.response.text();
  } catch (err) {
      console.error("Gemini Chat Error:", err);
      return "An error occurred while connecting to Google Gemini.";
  }
}

function generateMockInsights(campaigns: Campaign[]) {
    // Generate simple mock insights
    const insights: Insight[] = [
        { id: '1', type: '✅ Improvement', message: 'Campaign "Summer Sale - Retargeting" improved ROAS by 33% this week.', campaignId: 'c1' },
        { id: '2', type: '💡 Potential', message: 'Brand Search has excellent CTR. Consider increasing budget to capture more conversions.', campaignId: 'c2' },
        { id: '3', type: '⚠️ Deterioration', message: 'Prospecting ROAS dropped below 1.5. Suggest reviewing audience overlap.', campaignId: 'c3' }
    ];

    const campaignStatuses: Record<string, '🟢 Performing' | '🟡 Watch' | '🔴 Underperforming'> = {
        'c1': '🟢 Performing',
        'c2': '🟢 Performing',
        'c3': '🔴 Underperforming'
    };

    return { insights, campaignStatuses };
}
