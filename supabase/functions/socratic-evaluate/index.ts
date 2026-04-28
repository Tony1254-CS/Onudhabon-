// deno-lint-ignore-file no-explicit-any
// Socratic mastery evaluator.
// The AI acts as a strict Socratic tutor and decides — based ONLY on the
// student's own explanation — which concepts they have truly mastered,
// which are still weak, and which are gaps. Returns extracted concepts
// with the AI's verdict; only "strong" verdicts should promote a concept
// to mastered (gold star in the galaxy).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function evaluate(topic: string, studentExplanation: string): Promise<any | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const sys = `You are a STRICT Socratic tutor evaluating a Bangladeshi secondary student's spoken/typed explanation of "${topic}".
Your job: identify the concepts they tried to explain and decide — based ONLY on what they actually said — whether each one is truly mastered.

Verdict rules (be honest, do not be generous):
- "strong"  = student explained the concept correctly, clearly, in their own words, with cause/effect or example. Mastery proven.
- "weak"    = student mentioned it but explanation is partial, vague, memorised, or has small mistakes.
- "gap"     = student should have covered it for this topic but did not, OR said something clearly wrong.

Never mark a concept "strong" just because it was named. The student must DEMONSTRATE understanding.
Concept names must be in standard Bangla. Maximum 8 concepts.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Topic: ${topic}\n\nStudent's own explanation:\n${studentExplanation}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "evaluate_mastery",
            description: "Return per-concept mastery verdicts based on the student's explanation only.",
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
                      reason: { type: "string", description: "Short Bangla justification" },
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
        tool_choice: { type: "function", function: { name: "evaluate_mastery" } },
      }),
    });
    if (!r.ok) {
      console.error("evaluator http", r.status, await r.text());
      return null;
    }
    const j = await r.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (args) return JSON.parse(args);
    return null;
  } catch (e) {
    console.error("socratic-evaluate failed:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { topic, studentExplanation } = await req.json();
    if (!topic || !studentExplanation || !studentExplanation.trim()) {
      return new Response(JSON.stringify({ concepts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await evaluate(topic, studentExplanation);
    return new Response(JSON.stringify(result ?? { concepts: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("socratic-evaluate error:", e);
    return new Response(JSON.stringify({ concepts: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
