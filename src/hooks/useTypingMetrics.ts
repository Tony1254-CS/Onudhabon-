import { useCallback, useEffect, useRef, useState } from "react";
import type { TypingSnap } from "@/hooks/useCognitiveState";

/**
 * Tracks keystroke + backspace counts for the chat input.
 * Returns a `TypingSnap` plus an `onKeystroke` callback to wire into <ChatInput onKeystroke=… />.
 * Resets the counters every 90s so the ratio reflects RECENT typing, not session-total.
 */
export function useTypingMetrics(): { snap: TypingSnap; onKeystroke: (isBackspace: boolean) => void } {
  const ksRef = useRef(0);
  const bsRef = useRef(0);
  const lastTsRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const [, force] = useState(0);

  // Periodic reset so backspaceRatio doesn't get diluted by ancient typing.
  useEffect(() => {
    const id = setInterval(() => {
      const idleFor = Date.now() - lastTsRef.current;
      if (idleFor > 90000 && ksRef.current > 0) {
        ksRef.current = 0;
        bsRef.current = 0;
        force((n) => n + 1);
      }
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const onKeystroke = useCallback((isBackspace: boolean) => {
    ksRef.current += 1;
    if (isBackspace) bsRef.current += 1;
    lastTsRef.current = Date.now();
    // Throttle re-renders: only every 8 keystrokes is enough for the panel chip.
    if (ksRef.current % 8 === 0) force((n) => n + 1);
  }, []);

  return {
    snap: {
      keystrokes: ksRef.current,
      backspaces: bsRef.current,
      lastTypingTs: lastTsRef.current,
      sessionStartTs: sessionStartRef.current,
    },
    onKeystroke,
  };
}
