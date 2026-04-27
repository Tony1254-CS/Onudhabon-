import { useCallback, useRef, useState } from "react";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-completion`;
const RAG_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-query`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type ChatMsg = { role: "user" | "assistant"; content: string };

export function useChatStream() {
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (
    messages: ChatMsg[],
    opts: { topic: string; cognitiveState: string; useRAG?: boolean },
    onDelta: (text: string) => void,
  ) => {
    setStreaming(true);
    setProvider(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let ragContext: string[] = [];
    if (opts.useRAG) {
      try {
        const lastUser = [...messages].reverse().find(m => m.role === "user")?.content ?? opts.topic;
        const r = await fetch(RAG_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
          body: JSON.stringify({ query: lastUser }),
        });
        if (r.ok) {
          const j = await r.json();
          ragContext = j.chunks ?? [];
        }
      } catch { /* silent */ }
    }

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ messages, topic: opts.topic, cognitiveState: opts.cognitiveState, ragContext }),
        signal: abortRef.current.signal,
      });
      if (!resp.ok || !resp.body) throw new Error("stream failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { setStreaming(false); return; }
          try {
            const j = JSON.parse(data);
            if (j.provider) setProvider(j.provider);
            if (j.content) onDelta(j.content);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error("chat stream error:", e);
      onDelta("\n\n_সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করো।_");
    } finally {
      setStreaming(false);
    }
  }, []);

  return { send, streaming, provider, abort: () => abortRef.current?.abort() };
}
