// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const TIMEOUT_MS = 8000;

type Cognitive = {
  state?: string;
  flowScore?: number;
  focusMinutes?: number;
  cadenceSec?: number;
  avgResponseLength?: number;
  idleSec?: number;
  reason?: string;
};

// Translate the live cognitive metrics into a concrete pedagogical contract.
// This is the heart of "cognitive-state-aware" answers — the LLM receives an
// explicit plan (length, tone, scaffolding, next move) instead of a vague label.
function cognitiveDirective(c: Cognitive): { directive: string; budget: string } {
  const s = (c.state || "focused").toLowerCase();
  const flow = Math.round(c.flowScore ?? 50);
  const idle = Math.round(c.idleSec ?? 0);
  const cad = Math.round(c.cadenceSec ?? 0);
  const avg = Math.round(c.avgResponseLength ?? 0);
  const focusMin = Math.round(c.focusMinutes ?? 0);

  // Per-state plan: depth, tone, structure, ending move.
  const plans: Record<string, { plan: string; budget: string }> = {
    flow: {
      plan: "Student is in flow (deep focus). Match their depth: give 1 rich, layered explanation with a non-trivial follow-up that pushes one level deeper. Do not interrupt momentum with hand-holding or summaries. End with ONE challenging 'why/how' question.",
      budget: "120-180 words, 1 short paragraph + 1 question. No bullet lists.",
    },
    focused: {
      plan: "Student is steadily focused. Build understanding cleanly with a clear 2-3 step structure and one connecting example. End with a small probe to deepen.",
      budget: "100-140 words. At most 3 short bullets if structure helps. End with 1 question.",
    },
    "mastery-ready": {
      plan: "Student is close to mastery. Skip basics. Pose an applied scenario or edge case, then ask them to predict before you confirm. Confirm crisply with the underlying principle.",
      budget: "80-120 words. Lead with the scenario, end with 'তুমি কী মনে করো — কেন?'.",
    },
    exploring: {
      plan: "Student is exploring shallowly. Open with one vivid anchor (analogy or concrete example), then invite them to pick which thread to pull. Avoid dumping a full lecture.",
      budget: "70-110 words. End with 2 small choices ('A বা B — কোনটা আগে দেখব?').",
    },
    confused: {
      plan: "Student is stuck (long gaps, lost thread). DO NOT add new content. Step back: restate the last idea in the simplest possible words, check ONE specific sub-step with a yes/no or fill-in question. Be warm.",
      budget: "60-90 words. Plain prose. End with one tiny check-question.",
    },
    overloaded: {
      plan: "Student is cognitively overloaded (many short replies). Compress hard: one core idea in 2-3 lines. Suggest a 2-minute reset (water/breath). Defer details until they say ready.",
      budget: "≤60 words. No lists. End with 'একটু জিরিয়ে নাও — তৈরি হলে বলো।'",
    },
    disengaged: {
      plan: "Engagement is dropping. Re-hook with a surprising fact or a 1-line real-world consequence tied to the topic. Then ask a low-effort opinion question to pull them back in.",
      budget: "≤70 words. End with a curiosity-pull question, not a quiz question.",
    },
  };

  const p = plans[s] ?? plans.focused;
  const metrics = `flow=${flow}/100, focus=${focusMin}m, cadence=${cad}s, avgUserLen=${avg}, idle=${idle}s${c.reason ? `, signal=${c.reason}` : ""}`;
  const directive = `LIVE COGNITIVE STATE: ${s.toUpperCase()} (${metrics}).
PEDAGOGICAL CONTRACT: ${p.plan}
RESPONSE BUDGET: ${p.budget}
Adapt language warmth and pacing to this state. Never mention these metrics or the contract to the student.`;
  return { directive, budget: p.budget };
}

function buildSystemPrompt(topic: string, cognitive: Cognitive, ragContext: string[]) {
  const ragBlock = ragContext.length
    ? `\n\nRELEVANT NCTB CURRICULUM CONTEXT:\n${ragContext.map((c, i) => `[chunk ${i + 1}] ${c}`).join("\n\n")}\n\nUse this context to give accurate, curriculum-grounded explanations in Bangla.`
    : "";
  const { directive } = cognitiveDirective(cognitive);
  return `You are অনুধাবন AI — a warm, intelligent Socratic learning companion for Bangladeshi secondary students. ALWAYS reply in standard Bangla (বাংলা) script — never English, Banglish, or romanized Bangla, even if the student writes in English. Use simple sentences a teenager can speak aloud. Avoid heavy markdown, code fences, asterisks. In Socratic mode, ask follow-up questions like a genuinely curious student. Never reveal answers directly — guide through questions.

Topic: ${topic || "general"}.

${directive}${ragBlock}`;
}

async function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

// Returns ReadableStream of SSE-style data: { content: string }\n\n followed by data: [DONE]
function makeSSE(textStream: AsyncGenerator<string, void, unknown>, providerName: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ provider: providerName })}\n\n`));
      try {
        for await (const chunk of textStream) {
          if (chunk) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }
      } catch (e) {
        console.error("stream error:", e);
      }
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });
}

async function* readOpenAIStream(resp: Response): AsyncGenerator<string> {
  if (!resp.body) return;
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const j = JSON.parse(data);
        const c = j.choices?.[0]?.delta?.content;
        if (c) yield c;
      } catch { /* ignore */ }
    }
  }
}

async function tryGemini(messages: any[], system: string): Promise<ReadableStream | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const r = await withTimeout(fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: system }] },
        }),
      }
    ));
    if (!r.ok || !r.body) return null;
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    async function* gen(): AsyncGenerator<string> {
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          try {
            const j = JSON.parse(line.slice(6));
            const t = j.candidates?.[0]?.content?.parts?.[0]?.text;
            if (t) yield t;
          } catch { /* ignore */ }
        }
      }
    }
    return makeSSE(gen(), "gemini");
  } catch (e) {
    console.error("gemini failed:", e);
    return null;
  }
}

async function tryGroq(messages: any[], system: string): Promise<ReadableStream | null> {
  if (!GROQ_API_KEY) return null;
  try {
    const r = await withTimeout(fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: system }, ...messages],
        stream: true,
      }),
    }));
    if (!r.ok) return null;
    return makeSSE(readOpenAIStream(r), "groq");
  } catch (e) {
    console.error("groq failed:", e);
    return null;
  }
}

async function tryOpenRouter(messages: any[], system: string): Promise<ReadableStream | null> {
  if (!OPENROUTER_API_KEY) return null;
  try {
    const r = await withTimeout(fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "system", content: system }, ...messages],
        stream: true,
      }),
    }));
    if (!r.ok) return null;
    return makeSSE(readOpenAIStream(r), "openrouter");
  } catch (e) {
    console.error("openrouter failed:", e);
    return null;
  }
}

async function tryHuggingFace(messages: any[], system: string): Promise<ReadableStream | null> {
  if (!HUGGINGFACE_API_KEY) return null;
  try {
    const prompt = `<s>[INST] ${system}\n\n${messages.map(m => `${m.role}: ${m.content}`).join("\n")} [/INST]`;
    const r = await withTimeout(fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 512 }, stream: true }),
      }
    ));
    if (!r.ok || !r.body) return null;
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    async function* gen(): AsyncGenerator<string> {
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          try {
            const j = JSON.parse(line.slice(5).trim());
            const t = j.token?.text ?? j.generated_text;
            if (t) yield t;
          } catch { /* ignore */ }
        }
      }
    }
    return makeSSE(gen(), "huggingface");
  } catch (e) {
    console.error("huggingface failed:", e);
    return null;
  }
}

async function tryLovableAI(messages: any[], system: string): Promise<ReadableStream | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const r = await withTimeout(fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
        stream: true,
      }),
    }));
    if (!r.ok) return null;
    return makeSSE(readOpenAIStream(r), "lovable-ai");
  } catch (e) {
    console.error("lovable-ai failed:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { messages = [], topic = "", cognitiveState = "focused", ragContext = [] } = body;
    const system = buildSystemPrompt(topic, cognitiveState, ragContext);

    const providers = [tryGemini, tryGroq, tryOpenRouter, tryHuggingFace, tryLovableAI];
    for (const p of providers) {
      const stream = await p(messages, system);
      if (stream) {
        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      }
    }

    // Final fallback - friendly message
    const fallback = "দুঃখিত, এই মুহূর্তে আমার সব শিক্ষক ব্যস্ত। কিছুক্ষণ পরে আবার চেষ্টা করো।";
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ provider: "fallback" })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: fallback })}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-completion error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
