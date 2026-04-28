// Topic-scoped notes & mindmap fetcher with full offline support.
// Strategy: try cache-first when offline; otherwise network-first with cache fallback.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { idbGet, idbPut, idbAll } from "@/lib/idb";

const URL_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type NoteSection = { heading: string; points: string[] };
export type NoteFormula = { name: string; expression: string; meaning: string };
export type NoteQuiz = { question: string; answer: string };
export type Notes = {
  title: string;
  summary: string;
  sections: NoteSection[];
  formulas?: NoteFormula[];
  examples: string[];
  tips: string[];
  quiz: NoteQuiz[];
};

export type MindMapBranch = {
  name: string;
  description: string;
  children: { name: string; description: string }[];
};
export type MindMapData = {
  root: string;
  summary: string;
  branches: MindMapBranch[];
};

type CachedItem<T> = { topic: string; data: T; savedAt: number };

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

async function callFn<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const r = await fetch(`${URL_BASE}/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`${path} failed (${r.status}) ${txt.slice(0, 120)}`);
  }
  return r.json();
}

export function useTopicNotes(topic: string) {
  const [data, setData] = useState<Notes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const key = slug(topic);

  // Load cached on topic change
  useEffect(() => {
    let cancelled = false;
    if (!key) { setData(null); return; }
    (async () => {
      const cached = await idbGet<CachedItem<Notes>>("notes", key);
      if (cancelled) return;
      if (cached?.data) { setData(cached.data); setFromCache(true); }
      else { setData(null); setFromCache(false); }
    })();
    return () => { cancelled = true; };
  }, [key]);

  const generate = useCallback(async (force = false) => {
    if (!topic.trim()) return;
    setError(null);
    if (!force) {
      const cached = await idbGet<CachedItem<Notes>>("notes", key);
      if (cached?.data) { setData(cached.data); setFromCache(true); return; }
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("offline_no_cache");
      return;
    }
    setLoading(true);
    try {
      const result = await callFn<Notes>("generate-notes", { topic });
      const item: CachedItem<Notes> = { topic, data: result, savedAt: Date.now() };
      await idbPut("notes", key, item);
      setData(result);
      setFromCache(false);
    } catch (e) {
      const cached = await idbGet<CachedItem<Notes>>("notes", key);
      if (cached?.data) { setData(cached.data); setFromCache(true); }
      else setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  }, [topic, key]);

  return { data, loading, error, fromCache, generate };
}

export function useTopicMindMap(topic: string) {
  const [data, setData] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const key = slug(topic);

  useEffect(() => {
    let cancelled = false;
    if (!key) { setData(null); return; }
    (async () => {
      const cached = await idbGet<CachedItem<MindMapData>>("mindmaps", key);
      if (cancelled) return;
      if (cached?.data) { setData(cached.data); setFromCache(true); }
      else { setData(null); setFromCache(false); }
    })();
    return () => { cancelled = true; };
  }, [key]);

  const generate = useCallback(async (force = false) => {
    if (!topic.trim()) return;
    setError(null);
    if (!force) {
      const cached = await idbGet<CachedItem<MindMapData>>("mindmaps", key);
      if (cached?.data) { setData(cached.data); setFromCache(true); return; }
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("offline_no_cache");
      return;
    }
    setLoading(true);
    try {
      const result = await callFn<MindMapData>("generate-mindmap", { topic });
      const item: CachedItem<MindMapData> = { topic, data: result, savedAt: Date.now() };
      await idbPut("mindmaps", key, item);
      setData(result);
      setFromCache(false);
    } catch (e) {
      const cached = await idbGet<CachedItem<MindMapData>>("mindmaps", key);
      if (cached?.data) { setData(cached.data); setFromCache(true); }
      else setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  }, [topic, key]);

  return { data, loading, error, fromCache, generate };
}

export async function listOfflineNotes(): Promise<CachedItem<Notes>[]> {
  return idbAll<CachedItem<Notes>>("notes");
}
export async function listOfflineMindMaps(): Promise<CachedItem<MindMapData>[]> {
  return idbAll<CachedItem<MindMapData>>("mindmaps");
}
