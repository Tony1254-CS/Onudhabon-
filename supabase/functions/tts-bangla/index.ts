// Free Bangla Text-to-Speech using Hugging Face Inference API
// Model: facebook/mms-tts-ben (Massively Multilingual Speech, Bangla)
// Returns raw WAV audio bytes.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HF_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
const MODEL = "facebook/mms-tts-ben";
const HF_URL = `https://api-inference.huggingface.co/models/${MODEL}`;

// Strip markdown / symbols that read badly in TTS.
function clean(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*_~>`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function callHF(text: string, attempt = 0): Promise<Response> {
  const r = await fetch(HF_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "audio/wav",
    },
    body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
  });
  // HF cold-start: 503 with estimated_time. Retry once.
  if (r.status === 503 && attempt === 0) {
    try {
      const body = await r.clone().json();
      const wait = Math.min(15, Number(body?.estimated_time ?? 6));
      await new Promise((res) => setTimeout(res, (wait + 1) * 1000));
    } catch {
      await new Promise((res) => setTimeout(res, 7000));
    }
    return callHF(text, attempt + 1);
  }
  return r;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!HF_API_KEY) {
      return new Response(JSON.stringify({ error: "TTS not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cleaned = clean(text).slice(0, 1000); // model latency cap
    if (!cleaned) {
      return new Response(JSON.stringify({ error: "empty text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await callHF(cleaned);
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("HF TTS error", r.status, detail.slice(0, 300));
      return new Response(JSON.stringify({ error: "tts_failed", status: r.status, detail: detail.slice(0, 300) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audio = await r.arrayBuffer();
    const ct = r.headers.get("content-type") || "audio/wav";
    return new Response(audio, {
      headers: {
        ...corsHeaders,
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("tts-bangla error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
