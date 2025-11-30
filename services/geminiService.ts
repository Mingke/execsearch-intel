import { GoogleGenAI, Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AnalysisResult } from "../types";

// Define the response schema to ensure strictly typed JSON output
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tier1: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, description: "Must be 'Urgent/High-Priority' if signals found, or 'No relevant signals identified'." },
        items: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of identified signals (e.g. appointments, M&A). Empty if none." },
        hasSignals: { type: Type.BOOLEAN, description: "True if relevant Tier 1 signals were found." }
      },
      required: ["status", "items", "hasSignals"]
    },
    tier2: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, description: "Must be 'Future Opportunity' if signals found, or 'No relevant signals identified'." },
        items: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of identified strategic signals. Empty if none." },
        hasSignals: { type: Type.BOOLEAN, description: "True if relevant Tier 2 signals were found." }
      },
      required: ["status", "items", "hasSignals"]
    },
    insight: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING, description: "The synthesized pitch angle." },
        hasSignals: { type: Type.BOOLEAN, description: "True if an insight could be generated." }
      },
      required: ["content", "hasSignals"]
    }
  },
  required: ["tier1", "tier2", "insight"]
};

export const analyzeContent = async (text: string): Promise<AnalysisResult> => {
  // Use process.env.API_KEY as per guidelines. 
  // We assume the environment variable is properly configured.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // System instruction moved to config for better adherence
  const systemPrompt = `
    You are an Executive Search Intelligence Analyst. Your task is to analyze the provided merged web content related to a target lead. 
    Only focus on **executive-level** insights (VP and above).
    
    Adhere strictly to these rules for extraction:
    
    1. **Immediate Executive Search Triggers (Tier 1 Signals):**
       - News in last 12 months: C-Suite appointments/departures, succession planning.
       - News in last 12 months: Major M&A, Funding, IPOs, Activist investor pressure.
       - News in last 12 months: Major restructuring, reorganization, layoffs affecting leadership.
       - Logic: If found, status is "Urgent/High-Priority".
    
    2. **Strategic Growth & Future Roles (Tier 2 Signals):**
       - News in last 12 months: New market entries, Digital/ESG transformation, New regional HQ.
       - News in last 12 months: Hiring for "Head of", "Global", "President", "GM".
       - Logic: If found, status is "Future Opportunity".
    
    3. **Actionable Executive Search Insight:**
       - Synthesize a concise, single-paragraph pitch angle based on the above.
       - State WHAT role is needed and WHY based on facts.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: `Analyze the following Merged Web Content:\n\n${text}` }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2, // Low temperature for factual extraction
        // Critical for analyst tools: Disable safety filters to allow processing news about "layoffs", "crimes", or "activism" without blocking.
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Received empty response from Gemini API.");
    }

    // Clean potential Markdown wrapping (e.g. ```json ... ```) which commonly occurs even with responseMimeType
    const cleanJson = responseText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");

    return JSON.parse(cleanJson) as AnalysisResult;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    // Pass through readable error messages
    if (error.message && error.message.includes("403")) {
      throw new Error("Access Denied (403). Please check if your API Key has the correct 'Website restrictions' in Google Cloud Console.");
    }
    if (error.message && error.message.includes("429")) {
      throw new Error("Quota Exceeded (429). You may have run out of free requests.");
    }
    // Handle JSON parse errors specifically
    if (error instanceof SyntaxError) {
       throw new Error("Failed to parse AI response. The model might have returned malformed JSON.");
    }
    throw error;
  }
};