import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, WifiOff } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function OfflineBanner({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500/90 px-4 py-2 text-xs font-medium text-black backdrop-blur"
        >
          <WifiOff className="h-3.5 w-3.5" />
          অফলাইন মোড — সর্বশেষ সেশন ও ক্যাশড ডেটা ব্যবহৃত হচ্ছে
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PWAInstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const t = setTimeout(() => setShow(true), 2 * 60 * 1000);
    return () => { window.removeEventListener("beforeinstallprompt", handler); clearTimeout(t); };
  }, []);

  if (!show || !evt || dismissed) return null;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-[#0E1422]/95 p-4 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
        <Download className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">অনুধাবন AI ইনস্টল করো</p>
        <p className="text-xs text-white/50">অফলাইনেও কাজ করে</p>
      </div>
      <button
        onClick={async () => { await evt.prompt(); setDismissed(true); }}
        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400"
      >
        ইনস্টল করো
      </button>
      <button onClick={() => setDismissed(true)} className="text-white/40 hover:text-white/80" aria-label="dismiss">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
