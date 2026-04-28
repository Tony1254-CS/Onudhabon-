// Lightweight IndexedDB wrapper for offline cache
const DB_NAME = "onudhabon";
const DB_VERSION = 3;
const STORES = ["sessions", "concept_nodes", "rag_cache", "demo_responses", "notes", "mindmaps", "resources", "quiz_results"] as const;
type Store = typeof STORES[number];

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no-idb"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      STORES.forEach((s) => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "key" }); });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut(store: Store, key: string, value: unknown) {
  try {
    const db = await open();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put({ key, value, ts: Date.now() });
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* noop */ }
}

export async function idbGet<T = unknown>(store: Store, key: string): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise((res) => {
      const tx = db.transaction(store, "readonly");
      const r = tx.objectStore(store).get(key);
      r.onsuccess = () => res(((r.result as { value?: T })?.value) ?? null);
      r.onerror = () => res(null);
    });
  } catch { return null; }
}

export async function idbAll<T = unknown>(store: Store): Promise<T[]> {
  try {
    const db = await open();
    return await new Promise((res) => {
      const tx = db.transaction(store, "readonly");
      const r = tx.objectStore(store).getAll();
      r.onsuccess = () => res((r.result || []).map((x: { value: T }) => x.value));
      r.onerror = () => res([]);
    });
  } catch { return []; }
}

export async function cacheSession(session: unknown) {
  const all = await idbAll("sessions");
  const next = [session, ...all].slice(0, 10);
  await Promise.all(next.map((s, i) => idbPut("sessions", `s_${i}`, s)));
}
