// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

async function callJSON(messages: any[]): Promise<any | null> {
  // Try Lovable AI first (always available), then Gemini
  if (LOVABLE_API_KEY) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          tools: [{
            type: "function",
            function: {
              name: "extract_concepts",
              description: "Extract key learning concepts mentioned by the student",
              parameters: {
                type: "object",
                properties: {
                  concepts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Concept name in Bangla" },
                        confidence: { type: "string", enum: ["strong", "weak", "gap"] },
                        reason: { type: "string", description: "One short Bangla sentence (max 80 chars) explaining WHY this confidence — what the student showed or missed." },
                        related: { type: "array", items: { type: "string" } },
                      },
                      required: ["name", "confidence"],
                    },
                  },
                },
                required: ["concepts"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "extract_concepts" } },
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (args) return JSON.parse(args);
      }
    } catch (e) { console.error("lovable extract failed:", e); }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { topic, transcript } = await req.json();
    const sys = `You analyze a Bangladeshi student's spoken/typed explanation of "${topic}". Identify key concepts they mentioned. Mark each as: "strong" (confidently explained), "weak" (mentioned but unclear), or "gap" (expected but missing). Return concept names in Bangla. Maximum 8 concepts.`;
    const result = await callJSON([
      { role: "system", content: sys },
      { role: "user", content: `Topic: ${topic}\n\nStudent explanation:\n${transcript}` },
    ]);
    return new Response(JSON.stringify(result ?? { concepts: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-concepts error:", e);
    return new Response(JSON.stringify({ concepts: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
