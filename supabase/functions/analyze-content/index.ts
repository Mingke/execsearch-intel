// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions/deploy
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// System Prompt
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
    // 1. Initialize Supabase Client
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

    // 3. Admin Client (Service Role) for Quota Management
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
      console.error("Profile Error:", profileError);
      throw new Error('User profile not found')
    }

    if (profile.usage_count >= profile.usage_limit) {
      return new Response(JSON.stringify({ error: "Quota Exceeded" }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Get Input Text
    const { text } = await req.json()
    if (!text) throw new Error('Input text is required')

    // 6. Call Gemini API (using native fetch to avoid SDK issues in Deno)
    const apiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) throw new Error('Server API Key configuration missing')

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `Analyze the following Merged Web Content:\n\n${text}` }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            tier1: {
              type: "OBJECT",
              properties: {
                status: { type: "STRING" },
                items: { type: "ARRAY", items: { type: "STRING" } },
                hasSignals: { type: "BOOLEAN" }
              },
              required: ["status", "items", "hasSignals"]
            },
            tier2: {
              type: "OBJECT",
              properties: {
                status: { type: "STRING" },
                items: { type: "ARRAY", items: { type: "STRING" } },
                hasSignals: { type: "BOOLEAN" }
              },
              required: ["status", "items", "hasSignals"]
            },
            insight: {
              type: "OBJECT",
              properties: {
                content: { type: "STRING" },
                hasSignals: { type: "BOOLEAN" }
              },
              required: ["content", "hasSignals"]
            }
          }
        }
      }
    };

    console.log("Calling Gemini API...");
    // Using gemini-2.5-flash as per instructions
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API Error:", errText);
      throw new Error(`Gemini API Failed: ${geminiRes.status} ${geminiRes.statusText}`);
    }

    const aiData = await geminiRes.json();
    const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("Empty AI Response:", aiData);
      throw new Error('AI returned empty response');
    }

    // Parse JSON safely
    let analysisResult;
    try {
      analysisResult = JSON.parse(responseText);
    } catch (e) {
      console.error("JSON Parse Error:", e, responseText);
      throw new Error("Failed to parse AI response");
    }

    // 7. Increment Usage Count
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ usage_count: profile.usage_count + 1 })
      .eq('id', user.id)

    if (updateError) console.error("Failed to update quota:", updateError)

    // 8. Return Result
    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})