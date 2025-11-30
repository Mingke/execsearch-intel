
// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions/deploy
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Fix for missing Deno type definitions in the development environment
declare const Deno: any;

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

Deno.serve(async (req: any) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Health Check Endpoint (GET)
    // Used by Admin Dashboard to verify if the function is reachable
    if (req.method === 'GET') {
       return new Response(JSON.stringify({ 
         status: 'online', 
         timestamp: new Date().toISOString(),
         model: 'gemini-1.5-flash' // Currently using stable model
       }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       })
    }

    console.log("Edge Function Invoked: smooth-worker (analyze-content logic)");

    // 3. Initialize Supabase Client
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization Header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 4. Verify User
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error("Auth Error:", userError);
      throw new Error('Unauthorized: User not logged in')
    }

    // 5. Check Quota (Admin Client)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
       throw new Error('Server Config Error: SUPABASE_SERVICE_ROLE_KEY is missing')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    )

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('usage_count, usage_limit')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error("Profile Error:", profileError);
      throw new Error('User profile not found. Please contact support.')
    }

    if (profile.usage_count >= profile.usage_limit) {
      return new Response(JSON.stringify({ error: "Quota Exceeded" }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 6. Get Input Text
    const { text } = await req.json()
    if (!text) throw new Error('Input text is required')

    // 7. Call Gemini API (Native Fetch)
    const apiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) {
      throw new Error('Server Config Error: GOOGLE_API_KEY is missing in Secrets')
    }

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `Analyze this content:\n\n${text}` }]
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

    // Using gemini-1.5-flash for maximum stability with REST API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API Error:", errText);
      throw new Error(`Google API Error: ${geminiRes.status} - ${errText}`);
    }

    const aiData = await geminiRes.json();
    const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) throw new Error('AI returned empty response');

    // 8. Increment Quota
    await supabaseAdmin
      .from('profiles')
      .update({ usage_count: profile.usage_count + 1 })
      .eq('id', user.id)

    return new Response(responseText, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
});