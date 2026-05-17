import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { idbGet, idbPut } from "@/lib/idb";

const URL_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type MCQ = {
  question: string;
  choices: string[];
  correctIdx: number;
  explanation: string;
};

type Cached = { topic: string; count: number; questions: MCQ[]; savedAt: number };

const slug = (t: string) =>
  t.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 80);

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? KEY;
  return {
    Authorization: `Bearer ${token}`,
    apikey: KEY,
    "Content-Type": "application/json",
  } as Record<string, string>;
}

export function useQuizGenerator(topic: string) {
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const key = slug(topic);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    setQuestions([]);
    setError(null);
    setFromCache(false);
    if (!key) return;
    (async () => {
      const cached = await idbGet<Cached>("quiz_bank", key);
      if (cancelled || !cached?.questions?.length) return;
      setQuestions(cached.questions);
      setFromCache(true);
    })();
    return () => { cancelled = true; };
  }, [key]);

  const generate = useCallback(async (count: number) => {
    if (!topic.trim()) return;
    setError(null);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("offline");
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const r = await fetch(`${URL_BASE}/generate-quiz`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ topic, count, nonce: Math.random().toString(36).slice(2, 8) }),
        signal: ac.signal,
      });
      if (!r.ok) throw new Error(`quiz ${r.status}`);
      const j = await r.json();
      const qs: MCQ[] = Array.isArray(j.questions) ? j.questions : [];
      setQuestions(qs);
      setFromCache(false);
      await idbPut("quiz_bank", key, { topic, count, questions: qs, savedAt: Date.now() } as Cached);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  }, [topic, key]);

  return { questions, loading, error, fromCache, generate };
}
