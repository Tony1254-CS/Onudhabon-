import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Minimize2, Maximize2, X } from "lucide-react";
import { detectAttention, loadAttentionEngine, type AttentionSnapshot } from "@/lib/attention";

export type AttentionStatus = "off" | "loading" | "no-face" | "looking-away" | "stable" | "focused";

const STATUS_LABEL: Record<AttentionStatus, string> = {
  off: "বন্ধ",
  loading: "মডেল লোড হচ্ছে…",
  "no-face": "মুখ দেখা যাচ্ছে না",
  "looking-away": "অন্যদিকে তাকিয়ে আছ",
  stable: "মনোযোগী",
  focused: "গভীর মনোযোগ",
};

const STATUS_COLOR: Record<AttentionStatus, string> = {
  off: "#94A3B8",
  loading: "#60A5FA",
  "no-face": "#6B7280",
  "looking-away": "#F97316",
  stable: "#3B82F6",
  focused: "#F59E0B",
};

export function AttentionWidget({
  enabled, onConsentRequest, onDisable, onSignal,
}: {
  enabled: boolean;
  onConsentRequest: () => void;
  onDisable: () => void;
  onSignal: (s: { faceMissingFor: number; awayCount30s: number; status: AttentionStatus }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<AttentionStatus>("off");
  const [minimized, setMinimized] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // History
  const noFaceSinceRef = useRef<number | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const awayEventsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) {
      setStatus("off");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let engine: Awaited<ReturnType<typeof loadAttentionEngine>> | null = null;

    (async () => {
      setStatus("loading");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 240, height: 180, facingMode: "user" }, audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        engine = await loadAttentionEngine();
        if (cancelled) return;
        setStatus("no-face");

        const tick = async () => {
          if (cancelled || !videoRef.current || !engine) return;
          let snap: AttentionSnapshot;
          try {
            snap = await detectAttention(engine, videoRef.current);
          } catch { snap = { faceDetected: false, lookingAway: false, centerOffset: 1 }; }
          const now = Date.now();
          let next: AttentionStatus = "no-face";

          if (!snap.faceDetected) {
            if (noFaceSinceRef.current === null) noFaceSinceRef.current = now;
            stableSinceRef.current = null;
            next = "no-face";
          } else {
            noFaceSinceRef.current = null;
            if (snap.lookingAway) {
              awayEventsRef.current.push(now);
              awayEventsRef.current = awayEventsRef.current.filter((t) => now - t < 30000);
              stableSinceRef.current = null;
              next = "looking-away";
            } else {
              if (stableSinceRef.current === null) stableSinceRef.current = now;
              const stableFor = (now - stableSinceRef.current) / 1000;
              next = stableFor >= 10 ? "focused" : "stable";
            }
          }
          setStatus(next);
          onSignal({
            faceMissingFor: noFaceSinceRef.current ? (now - noFaceSinceRef.current) / 1000 : 0,
            awayCount30s: awayEventsRef.current.length,
            status: next,
          });
        };

        await tick();
        interval = setInterval(tick, 700);
      } catch (e) {
        console.error("attention init failed:", e);
        setStatus("off");
        onDisable();
      }
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [enabled, onDisable, onSignal]);

  if (!enabled) {
    return (
      <button
        onClick={onConsentRequest}
        className="absolute top-3 right-4 z-30 p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/60 backdrop-blur text-[var(--text-secondary)] hover:text-white hover:border-white/20 transition-all"
        title="মনোযোগ সংকেত চালু করো"
      >
        <Camera className="w-4 h-4" />
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute bottom-24 right-4 z-30 rounded-xl overflow-hidden border border-[var(--border)] bg-black/80 backdrop-blur"
        style={{
          width: minimized ? 48 : 152,
          height: minimized ? 48 : "auto",
          boxShadow: `0 0 20px ${STATUS_COLOR[status]}55`,
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full bg-black"
          style={{ height: minimized ? 48 : 90, objectFit: "cover", transform: "scaleX(-1)" }}
        />
        {!minimized && (
          <div className="px-2 py-1.5 flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: STATUS_COLOR[status], boxShadow: `0 0 6px ${STATUS_COLOR[status]}` }}
            />
            <span className="text-[10px] font-bangla truncate flex-1" style={{ color: STATUS_COLOR[status] }}>
              {STATUS_LABEL[status]}
            </span>
          </div>
        )}
        <div className="absolute top-1 right-1 flex gap-1">
          <button
            onClick={() => setMinimized((v) => !v)}
            className="p-1 rounded bg-black/60 text-white/70 hover:text-white"
          >
            {minimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button onClick={onDisable} className="p-1 rounded bg-black/60 text-white/70 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function AttentionConsentModal({
  open, onAccept, onCancel,
}: { open: boolean; onAccept: () => void; onCancel: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]"
            style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(59,130,246,0.15)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-[var(--accent-blue)]/15 border border-[var(--accent-blue)]/30">
                <Camera className="w-5 h-5 text-[var(--accent-cold-blue)]" />
              </div>
              <h3 className="font-display text-xl">মনোযোগ সংকেত</h3>
            </div>
            <p className="font-bangla text-sm text-[var(--text-secondary)] leading-relaxed mb-2">
              অনুধাবন AI তোমার মনোযোগ অনুমান করতে ক্যামেরা ব্যবহার করবে। কোনো ভিডিও সংরক্ষণ বা প্রেরণ করা হবে না। সব প্রক্রিয়া তোমার ডিভাইসেই থাকবে।
            </p>
            <ul className="text-xs text-[var(--text-secondary)] font-bangla space-y-1 mb-5 mt-3 pl-4 list-disc marker:text-[var(--accent-cold-blue)]">
              <li>সম্পূর্ণ অপশনাল — যেকোনো সময় বন্ধ করতে পারবে</li>
              <li>শুধু ব্রাউজারে প্রক্রিয়া — কোনো সার্ভারে যাবে না</li>
              <li>মুখের ছবি কখনোই সংরক্ষিত হবে না</li>
            </ul>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/[0.04] transition-all font-bangla text-sm"
              >
                না থাক
              </button>
              <button
                onClick={onAccept}
                className="flex-1 py-2.5 rounded-xl bg-[var(--accent-blue)] hover:bg-[var(--accent-cold-blue)] text-white font-bangla text-sm transition-all"
                style={{ boxShadow: "0 0 20px rgba(59,130,246,0.4)" }}
              >
                রাজি আছি
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
