// Generates structured Bangla study notes for any topic.
// Uses Lovable AI Gateway with structured tool-calling for reliable JSON.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM = `তুমি একজন বাংলা পাঠ্যক্রম বিশেষজ্ঞ ও শিক্ষক। যেকোনো বিষয়ের জন্য একটি পরিষ্কার, সুসংগঠিত study note তৈরি করো — সংজ্ঞা, মূল ধারণা, উদাহরণ, সূত্র (যদি থাকে), মনে রাখার টিপস, এবং ছোট quiz প্রশ্ন। সব text বাংলায়। কোন code block, markdown বা backtick ব্যবহার করো না।`;

const TOOL = {
  type: "function",
  function: {
    name: "build_notes",
    description: "Return structured Bangla study notes for the given topic.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Topic title in Bangla" },
        summary: { type: "string", description: "2-3 line Bangla overview" },
        sections: {
          type: "array",
          minItems: 3,
          maxItems: 7,
          items: {
            type: "object",
            properties: {
              heading: { type: "string", description: "Section heading in Bangla" },
              points: {
                type: "array",
                minItems: 2,
                maxItems: 6,
                items: { type: "string", description: "Bullet point in Bangla" },
              },
            },
            required: ["heading", "points"],
            additionalProperties: false,
          },
        },
        formulas: {
          type: "array",
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              expression: { type: "string", description: "Formula in plain text" },
              meaning: { type: "string", description: "Bangla explanation" },
            },
            required: ["name", "expression", "meaning"],
            additionalProperties: false,
          },
        },
        examples: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          items: { type: "string", description: "Example in Bangla" },
        },
        tips: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: { type: "string", description: "Memory tip in Bangla" },
        },
        quiz: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              answer: { type: "string" },
            },
            required: ["question", "answer"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "summary", "sections", "examples", "tips", "quiz"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { topic } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "topic required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `বিষয়: ${topic}\n\nএই বিষয়ের উপর সম্পূর্ণ study note তৈরি করো।` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "build_notes" } },
      }),
    });

    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      const t = await r.text();
      console.error("ai gateway error", r.status, t);
      return new Response(JSON.stringify({ error: "ai failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    const argStr = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argStr) {
      return new Response(JSON.stringify({ error: "no result" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = JSON.parse(argStr);
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
