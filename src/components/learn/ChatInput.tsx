import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, ImageIcon, Send, X } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

export function ChatInput({
  onSend, disabled, placeholder, voiceDisabled, voiceDisabledMessage,
}: { onSend: (text: string, image?: string) => void; disabled?: boolean; placeholder?: string; voiceDisabled?: boolean; voiceDisabledMessage?: string }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { recording, supported, start, stop } = useVoiceInput((t, final) => {
    setText((prev) => final ? (prev + " " + t).trim() : t);
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
          placeholder={placeholder ?? "তোমার প্রশ্ন বা ব্যাখ্যা লেখো…"}
          rows={1}
          className="flex-1 resize-none max-h-32 bg-white/[0.03] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[15px] font-bangla placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[var(--accent-blue)]/60 transition-colors"
        />

        {supported && (
          <motion.button
            onClick={recording ? stop : start}
            className="shrink-0 p-2.5 rounded-xl border transition-all relative"
            style={{
              borderColor: recording ? "rgba(239,68,68,0.6)" : "var(--border)",
              background: recording ? "rgba(239,68,68,0.1)" : "transparent",
              color: recording ? "#EF4444" : "var(--text-secondary)",
            }}
            animate={recording ? { boxShadow: ["0 0 0 0 rgba(239,68,68,0.4)", "0 0 0 12px rgba(239,68,68,0)"] } : {}}
            transition={recording ? { duration: 1.4, repeat: Infinity } : {}}
            title={recording ? "রেকর্ডিং বন্ধ করো" : "ভয়েস ইনপুট"}
          >
            {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
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
    </div>
  );
}
