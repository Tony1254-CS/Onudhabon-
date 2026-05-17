// Generates curated learning resources (YouTube + articles) for a topic.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM = `তুমি একজন বাংলা শিক্ষাসহায়ক। যেকোনো বিষয়ের জন্য শিক্ষার্থীর উপযোগী ৩-৫টি YouTube ভিডিও, ৩-৫টি প্রবন্ধ/আর্টিকেল এবং ১-২টি ইন্টারেক্টিভ অনুশীলন/সিমুলেশন সাজেস্ট করো। প্রতিটির জন্য বাস্তব এবং কার্যকর URL দাও (Khan Academy Bangla, 10 Minute School, Bangla Wikipedia, Banglapedia, NCTB, Crash Course, MIT OCW ইত্যাদি)। কোনো URL বানিয়ো না — যা সত্যিই আছে শুধু তা দাও। title, description এবং type বাংলায়।`;

const TOOL = {
  type: "function",
  function: {
    name: "build_resources",
    description: "Curated learning resources for a topic.",
    parameters: {
      type: "object",
      properties: {
        videos: {
          type: "array",
          minItems: 2, maxItems: 6,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              channel: { type: "string" },
              url: { type: "string", description: "YouTube URL or search URL" },
              description: { type: "string", description: "Bangla 1-line description" },
            },
            required: ["title", "url", "description", "channel"],
            additionalProperties: false,
          },
        },
        articles: {
          type: "array",
          minItems: 2, maxItems: 6,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              source: { type: "string" },
              url: { type: "string" },
              description: { type: "string" },
            },
            required: ["title", "url", "description", "source"],
            additionalProperties: false,
          },
        },
        practice: {
          type: "array",
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              url: { type: "string" },
              description: { type: "string" },
            },
            required: ["title", "url", "description"],
            additionalProperties: false,
          },
        },
      },
      required: ["videos", "articles"],
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
          { role: "user", content: `বিষয়: ${topic}\n\nএই বিষয়ের শেখার জন্য সবচেয়ে ভালো resources সাজেস্ট করো।` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "build_resources" } },
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
    const validated = await validateResources(data, topic);
    return new Response(JSON.stringify(validated), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-resources error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
