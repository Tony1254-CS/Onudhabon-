import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, ImageIcon, Send, X, Loader2 } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

export function ChatInput({
  onSend, disabled, placeholder, voiceDisabled, voiceDisabledMessage,
}: { onSend: (text: string, image?: string) => void; disabled?: boolean; placeholder?: string; voiceDisabled?: boolean; voiceDisabledMessage?: string }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const wasLongPress = useRef(false);

  const { recording, transcribing, supported, start, stop } = useVoiceInput((t) => {
    setText(t);
  });

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImage(r.result as string);
    r.readAsDataURL(f);
  };

  const submit = () => {
    if (!text.trim() && !image) return;
    onSend(text.trim(), image ?? undefined);
    setText("");
    setImage(null);
  };

  const onMicDown = () => {
    if (voiceDisabled || transcribing) return;
    wasLongPress.current = false;
    longPressTimer.current = window.setTimeout(() => {
      wasLongPress.current = true;
      // Long-press → push-to-talk Whisper directly
      start(text, true);
    }, 350);
  };

  const onMicUp = () => {
    if (voiceDisabled) return;
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (wasLongPress.current) {
      // End push-to-talk
      stop();
      return;
    }
    // Short tap = toggle Web Speech (with Whisper auto-fallback on error)
    if (recording) stop();
    else start(text);
  };

  const onMicLeave = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (wasLongPress.current && recording) stop();
  };

  const micTitle = voiceDisabled
    ? (voiceDisabledMessage || "ভয়েস ইনপুটের জন্য সংযোগ প্রয়োজন")
    : transcribing
      ? "Whisper দিয়ে অনুবাদ হচ্ছে…"
      : recording
        ? "থামাতে ক্লিক · ছাড়লে শেষ (push-to-talk)"
        : "ক্লিক: Web Speech · ধরে রাখো: Whisper push-to-talk";

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)]/60 backdrop-blur-xl p-4">
      {image && (
        <div className="mb-3 inline-flex items-center gap-2 p-2 pr-3 rounded-lg bg-white/[0.04] border border-[var(--border)]">
          <img src={image} alt="" className="w-10 h-10 rounded object-cover" />
          <span className="text-xs text-[var(--text-secondary)]">ছবি যোগ করা হয়েছে</span>
          <button onClick={() => setImage(null)} className="text-[var(--text-secondary)] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="shrink-0 p-2.5 rounded-xl border border-[var(--border)] hover:border-white/20 hover:bg-white/[0.04] text-[var(--text-secondary)] transition-all"
          title="ছবি আপলোড"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickImage} />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={transcribing ? "Whisper অনুবাদ করছে…" : (placeholder ?? "তোমার প্রশ্ন বা ব্যাখ্যা লেখো…")}
          rows={1}
          className="flex-1 resize-none max-h-32 bg-white/[0.03] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[15px] font-bangla placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[var(--accent-blue)]/60 transition-colors"
        />

        {supported && (
          <motion.button
            onPointerDown={onMicDown}
            onPointerUp={onMicUp}
            onPointerLeave={onMicLeave}
            disabled={voiceDisabled || transcribing}
            className="shrink-0 p-2.5 rounded-xl border transition-all relative disabled:opacity-40 disabled:cursor-not-allowed select-none touch-none"
            style={{
              borderColor: recording ? "rgba(239,68,68,0.6)" : transcribing ? "rgba(139,92,246,0.6)" : "var(--border)",
              background: recording ? "rgba(239,68,68,0.1)" : transcribing ? "rgba(139,92,246,0.12)" : "transparent",
              color: recording ? "#EF4444" : transcribing ? "#A78BFA" : "var(--text-secondary)",
            }}
            animate={recording ? { boxShadow: ["0 0 0 0 rgba(239,68,68,0.4)", "0 0 0 12px rgba(239,68,68,0)"] } : {}}
            transition={recording ? { duration: 1.4, repeat: Infinity } : {}}
            title={micTitle}
          >
            {transcribing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : recording
                ? <MicOff className="w-4 h-4" />
                : <Mic className="w-4 h-4" />}
          </motion.button>
        )}

        <button
          onClick={submit}
          disabled={disabled || (!text.trim() && !image)}
          className="shrink-0 p-2.5 rounded-xl bg-[var(--accent-blue)] hover:bg-[var(--accent-cold-blue)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          style={{ boxShadow: "0 0 20px rgba(59,130,246,0.35)" }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-secondary)]/60 font-bangla text-center">
        মাইকে চাপো: তাৎক্ষণিক ভয়েস · ধরে রাখো: Whisper দিয়ে নির্ভুল বাংলা ট্রান্সক্রিপশন
      </p>
    </div>
  );
}
