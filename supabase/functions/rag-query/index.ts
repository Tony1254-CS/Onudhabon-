// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LLAMAPARSE_API_KEY = Deno.env.get("LLAMAPARSE_API_KEY") ?? "";
const JOB_IDS = (Deno.env.get("LLAMAPARSE_JOB_IDS") ?? "").split(",").map(s => s.trim()).filter(Boolean);

// Simple in-memory cache for parsed text (cold-start only, but useful within a warm instance)
const textCache = new Map<string, string>();

async function fetchJobText(jobId: string): Promise<string> {
  if (textCache.has(jobId)) return textCache.get(jobId)!;
  try {
    const r = await fetch(
      `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/text`,
      { headers: { Authorization: `Bearer ${LLAMAPARSE_API_KEY}` } }
    );
    if (!r.ok) return "";
    const data = await r.json();
    const text = data.text ?? "";
    textCache.set(jobId, text);
    return text;
  } catch {
    return "";
  }
}

function chunkText(text: string): string[] {
  const sentences = text.split(/[।\.\n]+/).filter(s => s.trim().length > 20);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > 500) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current += " " + s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function score(text: string, query: string): number {
  const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const tl = text.toLowerCase();
  return qWords.filter(w => tl.includes(w)).length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query } = await req.json();
    if (!query || !LLAMAPARSE_API_KEY || JOB_IDS.length === 0) {
      return new Response(JSON.stringify({ chunks: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const texts = await Promise.all(JOB_IDS.map(fetchJobText));
    const allChunks = texts.flatMap(chunkText);
    const scored = allChunks
      .map(c => ({ c, s: score(c, query) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map(x => x.c);
    return new Response(JSON.stringify({ chunks: scored }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rag-query error:", e);
    return new Response(JSON.stringify({ chunks: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
