// Generates a hierarchical Bangla mind-map for any topic.
// Uses Lovable AI Gateway (Gemini Flash) with structured tool-calling for reliable JSON.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM = `তুমি একজন বাংলা পাঠ্যক্রম বিশেষজ্ঞ। যেকোনো বিষয়ের জন্য একটি hierarchical mind-map তৈরি করো — root concept, ৪-৬টি sub-branches, প্রতিটিতে ২-৪টি leaf concept। প্রতিটি node-এ ছোট বাংলা ব্যাখ্যা থাকবে। সব text বাংলায়। কোন code, markdown বা backtick ব্যবহার করো না।`;

const TOOL = {
  type: "function",
  function: {
    name: "build_mindmap",
    description: "Return hierarchical mind-map for the given topic.",
    parameters: {
      type: "object",
      properties: {
        root: { type: "string", description: "Main topic name in Bangla" },
        summary: { type: "string", description: "1-line Bangla overview" },
        branches: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              children: {
                type: "array",
                minItems: 2,
                maxItems: 4,
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["name", "description"],
                  additionalProperties: false,
                },
              },
            },
            required: ["name", "description", "children"],
            additionalProperties: false,
          },
        },
      },
      required: ["root", "summary", "branches"],
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
          { role: "user", content: `বিষয়: ${topic}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "build_mindmap" } },
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
    console.error("generate-mindmap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
