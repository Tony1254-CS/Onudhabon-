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

function buildSystemPrompt(topic: string, cognitiveState: string, ragContext: string[]) {
  const ragBlock = ragContext.length
    ? `\n\nRELEVANT NCTB CURRICULUM CONTEXT:\n${ragContext.map((c, i) => `[chunk ${i + 1}] ${c}`).join("\n\n")}\n\nUse this context to give accurate, curriculum-grounded explanations in Bangla.`
    : "";
  return `You are অনুধাবন AI — a warm, intelligent Socratic learning companion for Bangladeshi secondary students. ALWAYS reply in standard Bangla (বাংলা) script — never in English, Banglish, or romanized Bangla, even if the student writes in English. Use simple, clear sentences a teenager can speak aloud. Avoid heavy markdown, code fences, asterisks, or symbols that don't read well in voice; prefer plain Bangla prose with light punctuation. Adapt teaching based on the student's cognitive state. In Socratic mode, ask follow-up questions like a genuinely curious student. Keep responses concise, warm, and pedagogically effective. Never give away answers directly — guide through questions. Current cognitive state: ${cognitiveState || "focused"}. Topic: ${topic || "general"}.${ragBlock}`;
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
