import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Burst = { id: number; count: number };

export function MasteryBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { count?: number } | undefined;
      const id = Date.now() + Math.random();
      setBursts((b) => [...b, { id, count: detail?.count ?? 1 }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 3200);
    };
    window.addEventListener("mastery-burst", handler);
    return () => window.removeEventListener("mastery-burst", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* radial flare */}
            <div
              className="absolute w-[600px] h-[600px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(245,158,11,0.35) 0%, rgba(245,158,11,0.08) 40%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />
            {/* sparkle particles */}
            {Array.from({ length: 22 }).map((_, i) => {
              const angle = (i / 22) * Math.PI * 2;
              const dist = 180 + Math.random() * 120;
              const x = Math.cos(angle) * dist;
              const y = Math.sin(angle) * dist;
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
                  animate={{ x, y, opacity: 0, scale: 1 }}
                  transition={{ duration: 1.6, ease: "easeOut", delay: 0.05 }}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: "#fde047",
                    boxShadow: "0 0 12px #fde047, 0 0 24px #f59e0b",
                  }}
                />
              );
            })}
            {/* central star + label */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="pointer-events-auto relative flex flex-col items-center gap-3"
            >
              <motion.div
                animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 1.2, repeat: 1 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background:
                    "radial-gradient(circle at 35% 35%, #fef3c7, #f59e0b 60%, #b45309)",
                  boxShadow: "0 0 60px #f59e0b, 0 0 120px rgba(245,158,11,0.6)",
                }}
              >
                <Star className="w-10 h-10 text-white fill-white" strokeWidth={1.5} />
              </motion.div>
              <div
                className="px-4 py-2 rounded-full bg-black/70 backdrop-blur border border-amber-400/40 text-sm font-bangla text-amber-200 text-center"
                style={{ textShadow: "0 0 12px rgba(245,158,11,0.6)" }}
              >
                নতুন তারা মহাবিশ্বে যোগ হলো!{" "}
                <Link
                  to="/galaxy"
                  className="underline hover:text-amber-100 ml-1"
                >
                  দেখো →
                </Link>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
