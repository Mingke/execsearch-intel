// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions/deploy
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Schema, Type } from 'https://esm.sh/@google/genai'

// Declare Deno global for environments where Deno types are missing
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- JSON Schema (Same as frontend) ---
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tier1: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING },
        items: { type: Type.ARRAY, items: { type: Type.STRING } },
        hasSignals: { type: Type.BOOLEAN }
      },
      required: ["status", "items", "hasSignals"]
    },
    tier2: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING },
        items: { type: Type.ARRAY, items: { type: Type.STRING } },
        hasSignals: { type: Type.BOOLEAN }
      },
      required: ["status", "items", "hasSignals"]
    },
    insight: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING },
        hasSignals: { type: Type.BOOLEAN }
      },
      required: ["content", "hasSignals"]
    }
  },
  required: ["tier1", "tier2", "insight"]
};

// --- System Prompt ---
const systemPrompt = `
You are an Executive Search Intelligence Analyst. Your task is to analyze the provided merged web content related to a target lead. Only focus on **executive-level** insights (VP and above).

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

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Client (Service Role for Admin actions, or Auth context)
    // We use the Authorization header to create a client that acts AS the user for reading
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 2. Verify User
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // 3. Admin Client (To bypass RLS for incrementing usage if needed, or ensuring data integrity)
    // We strictly need the Service Role key to safely increment the counter without user manipulation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Check Quota
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('usage_count, usage_limit')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    if (profile.usage_count >= profile.usage_limit) {
      // Return 402 Payment Required status for quota exceeded
      return new Response(JSON.stringify({ error: "Quota Exceeded" }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Get Input Text
    const { text } = await req.json()
    if (!text) throw new Error('Input text is required')

    // 6. Call Gemini API
    const apiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) throw new Error('Server API Key configuration missing')

    const ai = new GoogleGenAI({ apiKey });
    
    // Note: Deno environment, ensuring we use standard fetch implicitly supported by SDK
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: `Analyze the following Merged Web Content:\n\n${text}` }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    const responseText = response.text;
    if (!responseText) throw new Error('AI returned empty response');
    
    // Clean markdown if present
    const cleanJson = responseText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    const analysisResult = JSON.parse(cleanJson);

    // 7. Increment Usage Count (Using Admin Client)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ usage_count: profile.usage_count + 1 })
      .eq('id', user.id)

    if (updateError) console.error("Failed to update quota:", updateError)

    // 8. Return Result
    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})