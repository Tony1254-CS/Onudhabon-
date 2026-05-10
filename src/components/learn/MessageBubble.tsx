import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Volume2, VolumeX } from "lucide-react";
import type { ChatMsg } from "@/hooks/useChatStream";
import type { CognitiveState } from "@/hooks/useCognitiveState";
import { CognitiveHint } from "./CognitiveHint";

export function MessageBubble({
  msg,
  streaming,
  canSpeak,
  speaking,
  onSpeak,
}: {
  msg: ChatMsg & { image?: string; cogState?: CognitiveState };
  streaming?: boolean;
  canSpeak?: boolean;
  speaking?: boolean;
  onSpeak?: (text: string) => void;
}) {
  const isAI = msg.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className={`flex flex-col ${isAI ? "items-start" : "items-end"} mb-4`}
    >
      <div
        className={`group relative max-w-[78%] px-4 py-3 rounded-2xl backdrop-blur-xl border text-[15px] leading-relaxed ${
          isAI
            ? "bg-white/[0.03] border-[var(--accent-blue)]/30 rounded-tl-sm"
            : "bg-[var(--accent-purple)]/10 border-[var(--accent-purple)]/30 rounded-tr-sm"
        }`}
        style={{
          boxShadow: isAI
            ? "0 0 20px rgba(59,130,246,0.08), inset 0 0 0 1px rgba(59,130,246,0.04)"
            : "0 0 20px rgba(139,92,246,0.08), inset 0 0 0 1px rgba(139,92,246,0.04)",
        }}
      >
        {msg.image && (
          <img src={msg.image} alt="upload" className="rounded-lg mb-2 max-h-48 object-cover" />
        )}
        <div className="font-bangla prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_strong]:text-[var(--accent-cold-blue)]">
          <ReactMarkdown>{msg.content || (streaming ? " " : "")}</ReactMarkdown>
        </div>
        {streaming && isAI && (
          <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-[var(--accent-cold-blue)] animate-pulse rounded-sm" />
        )}
        {isAI && canSpeak && msg.content && !streaming && onSpeak && (
          <button
            onClick={() => onSpeak(msg.content)}
            title={speaking ? "থামাও" : "শোনো"}
            className="absolute -bottom-3 -right-2 p-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent-cold-blue)] hover:border-[var(--accent-blue)]/50 opacity-0 group-hover:opacity-100 transition-all"
          >
            {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {isAI && !streaming && msg.cogState && <CognitiveHint state={msg.cogState} />}
    </motion.div>
  );
}

export function TypingDots() {
  return (
    <div className="flex justify-start mb-4">
      <div className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-[var(--accent-blue)]/30 rounded-tl-sm">
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--accent-cold-blue)]"
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
