// Bangla speech-to-text fallback using Groq Whisper.
// Used when the browser's Web Speech API can't reliably transcribe bn-BD.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "STT not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incoming = await req.formData();
    const audio = incoming.get("audio");
    const language = (incoming.get("language") as string) || "bn";
    if (!(audio instanceof File) && !(audio instanceof Blob)) {
      return new Response(JSON.stringify({ error: "audio file missing" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fd = new FormData();
    // Groq accepts m4a, mp3, mp4, mpeg, mpga, wav, webm
    fd.append("file", audio, "voice.webm");
    fd.append("model", "whisper-large-v3");
    fd.append("language", language);
    fd.append("response_format", "json");
    fd.append("temperature", "0");

    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: fd,
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("groq stt failed:", r.status, t);
      return new Response(JSON.stringify({ error: "transcription failed", detail: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    return new Response(JSON.stringify({ text: j.text ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-audio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
