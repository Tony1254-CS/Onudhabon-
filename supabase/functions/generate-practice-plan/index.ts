// Generates a step-by-step practice plan from the user's weakest concepts using Lovable AI Gateway.
// Persists the plan in `practice_plans`. Each step is linked to /learn?topic=<concept>.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Concept = { concept: string; mastery_level: number | null; subject: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "Missing authorization");

    // Resolve user from JWT
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
    });
    if (!userRes.ok) return jsonError(401, "Invalid token");
    const { id: userId } = await userRes.json();
    if (!userId) return jsonError(401, "No user");

    // Pull the weakest concepts (admin client — RLS bypassed but scoped by user_id)
    const cnRes = await fetch(
      `${SUPABASE_URL}/rest/v1/concept_nodes?user_id=eq.${userId}&select=concept,mastery_level,subject&order=mastery_level.asc&limit=8`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const concepts = await cnRes.json() as Concept[];
    const weak = concepts.filter((c) => (c.mastery_level ?? 0) < 0.7).slice(0, 6);

    if (weak.length === 0) {
      return new Response(JSON.stringify({ ok: true, plan: null, message: "কোনো দুর্বল ধারণা নেই — দারুণ!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt for Lovable AI
    const prompt = `তুমি একজন বাংলা টিউটর। নিচের দুর্বল ধারণাগুলোর জন্য একটি ধাপে-ধাপে রিভিউ প্ল্যান তৈরি করো (Bangla-তে):
${weak.map((c, i) => `${i + 1}. ${c.concept} (দক্ষতা: ${Math.round((c.mastery_level ?? 0) * 100)}%${c.subject ? `, বিষয়: ${c.subject}` : ""})`).join("\n")}

প্রতিটি ধারণার জন্য একটি ধাপ তৈরি করো। JSON অ্যারে হিসেবে উত্তর দাও — অন্য কিছু লিখো না:
[{"concept":"...", "title":"...", "description":"১-২ বাক্যে কী করতে হবে", "duration_min": 10}]`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      // Fallback: build deterministic plan
      const fallback = weak.map((c) => ({
        concept: c.concept,
        title: `${c.concept} পর্যালোচনা`,
        description: `এই ধারণাটি আবার পড়ো ও অনুধাবন AI-এর সাথে আলোচনা করো।`,
        duration_min: 10,
      }));
      return await persistAndReturn(userId, fallback, SUPABASE_URL, SERVICE_KEY);
    }

    const aiData = await aiRes.json();
    const raw: string = aiData.choices?.[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let steps: Array<{ concept: string; title: string; description: string; duration_min: number }> = [];
    try {
      const match = cleaned.match(/\[[\s\S]*\]/);
      steps = JSON.parse(match ? match[0] : cleaned);
    } catch (e) {
      console.warn("Failed to parse AI JSON, falling back:", e);
      steps = weak.map((c) => ({ concept: c.concept, title: `${c.concept} পর্যালোচনা`, description: "এই ধারণাটি আবার পড়ো।", duration_min: 10 }));
    }

    return await persistAndReturn(userId, steps, SUPABASE_URL, SERVICE_KEY);
  } catch (e) {
    console.error("generate-practice-plan error:", e);
    return jsonError(500, String(e));
  }
});

async function persistAndReturn(
  userId: string,
  steps: Array<{ concept: string; title: string; description: string; duration_min: number }>,
  SUPABASE_URL: string,
  SERVICE_KEY: string,
) {
  const totalMin = steps.reduce((a, s) => a + (s.duration_min || 10), 0);
  const title = `${steps.length}টি ধাপের রিভিউ প্ল্যান (~${totalMin} মিনিট)`;

  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/practice_plans`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ user_id: userId, title, steps, status: "active" }),
  });
  const plan = await insRes.json();
  return new Response(JSON.stringify({ ok: true, plan: Array.isArray(plan) ? plan[0] : plan }), {
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}
