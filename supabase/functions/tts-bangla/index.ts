// Free real-time Bangla Text-to-Speech.
// Primary: Google Translate's public TTS endpoint (unauthenticated, free, MP3 audio).
//   - Limit: ~200 chars per request → we chunk on the client side, but server also splits.
// Returns audio/mpeg bytes.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

// Split into <=180 char chunks on sentence/space boundaries.
function splitChunks(text: string, maxLen = 180): string[] {
  if (text.length <= maxLen) return [text];
  const out: string[] = [];
  let buf = "";
  // Split on Bangla daari + western punctuation, keep delimiter
  const parts = text.split(/(?<=[।!?\.])\s+/u);
  for (const p of parts) {
    if (!p) continue;
    if ((buf + " " + p).trim().length <= maxLen) {
      buf = (buf ? buf + " " : "") + p;
    } else {
      if (buf) out.push(buf.trim());
      if (p.length <= maxLen) {
        buf = p;
      } else {
        // hard wrap on word boundaries
        const words = p.split(/\s+/);
        let inner = "";
        for (const w of words) {
          if ((inner + " " + w).trim().length > maxLen) {
            if (inner) out.push(inner.trim());
            inner = w;
          } else {
            inner = (inner ? inner + " " : "") + w;
          }
        }
        buf = inner;
      }
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

async function fetchGoogleTTS(text: string, lang = "bn"): Promise<ArrayBuffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob&ttsspeed=0.95`;
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://translate.google.com/",
      "Accept": "audio/mpeg,audio/*;q=0.9,*/*;q=0.5",
    },
  });
  if (!r.ok) throw new Error(`google tts ${r.status}`);
  return r.arrayBuffer();
}

// Concatenate MP3 frame buffers — browsers play concatenated MP3 fine.
function concatBuffers(bufs: ArrayBuffer[]): Uint8Array {
  const total = bufs.reduce((n, b) => n + b.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of bufs) {
    out.set(new Uint8Array(b), off);
    off += b.byteLength;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = typeof body?.text === "string" ? body.text : "";
    const lang = typeof body?.lang === "string" ? body.lang : "bn";
    const cleaned = clean(rawText).slice(0, 1500);
    if (!cleaned) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chunks = splitChunks(cleaned);

    // Fetch all chunks in parallel for speed.
    const buffers = await Promise.all(chunks.map((c) => fetchGoogleTTS(c, lang)));
    const merged = concatBuffers(buffers);

    return new Response(merged, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("tts-bangla error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
