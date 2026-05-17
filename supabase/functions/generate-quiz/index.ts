// Generates fresh MCQ quiz questions for a topic. Supports count + nonce for variation.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM = `তুমি একজন বাংলা পরীক্ষক। প্রদত্ত বিষয়ের উপর বৈচিত্র্যময়, অনন্য MCQ প্রশ্ন তৈরি করো। প্রতিটি প্রশ্নে ৪টি বিকল্প থাকবে — একটি সঠিক, তিনটি বিশ্বাসযোগ্য ভুল উত্তর (distractor)। প্রশ্ন স্পষ্ট, সংক্ষিপ্ত, বাংলায়। কঠিনতা ভিন্ন রাখো (সহজ → কঠিন)। আগের প্রশ্নের পুনরাবৃত্তি করো না।`;

const TOOL = {
  type: "function",
  function: {
    name: "build_quiz",
    description: "Return MCQ quiz questions.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 5,
          maxItems: 25,
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              choices: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
              correctIdx: { type: "integer", minimum: 0, maximum: 3 },
              explanation: { type: "string", description: "Short Bangla explanation of correct answer" },
            },
            required: ["question", "choices", "correctIdx", "explanation"],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { topic, count = 10, nonce } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "topic required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const n = Math.max(5, Math.min(25, Number(count) || 10));
    const seed = nonce ?? Math.random().toString(36).slice(2, 8);

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `বিষয়: ${topic}\nপ্রশ্ন সংখ্যা: ${n}\nভ্যারিয়েশন seed: ${seed}\n\nএই বিষয়ের উপর ${n}টি নতুন MCQ তৈরি করো। প্রতিটি প্রশ্নে ৪টি বিকল্প রাখো এবং correctIdx (0-3) দাও।` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "build_quiz" } },
      }),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) {
      const t = await r.text();
      console.error("ai gateway error", r.status, t);
      return new Response(JSON.stringify({ error: "ai failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    const argStr = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argStr) return new Response(JSON.stringify({ error: "no result" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const data = JSON.parse(argStr);
    // sanity-clamp correctIdx
    data.questions = (data.questions ?? []).map((q: any) => ({
      ...q,
      correctIdx: Math.max(0, Math.min(3, Number(q.correctIdx) || 0)),
    }));
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
