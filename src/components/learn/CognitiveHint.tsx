import { Sparkles, Compass, HeartHandshake, Wind, Lightbulb, Trophy, Waves } from "lucide-react";
import type { CognitiveState } from "@/hooks/useCognitiveState";

// Friendly, non-metric explanations for *why* the AI shaped its answer
// the way it did. Never expose internal scores / numbers here.
const HINTS: Record<CognitiveState, { icon: typeof Sparkles; label: string; tone: string }> = {
  flow: {
    icon: Waves,
    label: "তুমি flow-এ ছিলে — তাই আরো গভীরে গেলাম",
    tone: "text-cyan-300 border-cyan-400/30 bg-cyan-400/[0.06]",
  },
  focused: {
    icon: Compass,
    label: "মনোযোগ স্থির — স্বাভাবিক গতিতে এগোলাম",
    tone: "text-blue-300 border-blue-400/30 bg-blue-400/[0.06]",
  },
  "mastery-ready": {
    icon: Trophy,
    label: "তুমি প্রস্তুত মনে হলো — একটু চ্যালেঞ্জ যোগ করলাম",
    tone: "text-amber-300 border-amber-400/30 bg-amber-400/[0.06]",
  },
  exploring: {
    icon: Lightbulb,
    label: "তুমি ভাবছিলে — তাই নতুন কোণ খুললাম",
    tone: "text-violet-300 border-violet-400/30 bg-violet-400/[0.06]",
  },
  confused: {
    icon: HeartHandshake,
    label: "একটু জটিল লাগছিল — তাই সহজ করে দেখালাম",
    tone: "text-orange-300 border-orange-400/30 bg-orange-400/[0.06]",
  },
  overloaded: {
    icon: Wind,
    label: "অনেকটা একসাথে এসেছিল — তাই ছোট করে রাখলাম",
    tone: "text-rose-300 border-rose-400/30 bg-rose-400/[0.06]",
  },
  disengaged: {
    icon: Sparkles,
    label: "গতি একটু কমে এসেছিল — তোমাকে আবার টানতে চাইলাম",
    tone: "text-pink-300 border-pink-400/30 bg-pink-400/[0.06]",
  },
};

export function CognitiveHint({ state }: { state?: CognitiveState | null }) {
  if (!state) return null;
  const h = HINTS[state];
  if (!h) return null;
  const Icon = h.icon;
  return (
    <div
      title="তোমার বর্তমান cognitive state অনুযায়ী AI উত্তরের ধরন ঠিক করেছে।"
      className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bangla leading-none ${h.tone}`}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{h.label}</span>
    </div>
  );
}
