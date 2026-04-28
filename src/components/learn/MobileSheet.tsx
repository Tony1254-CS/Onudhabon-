import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function MobileSheet({
  open, onClose, side = "left", children, title,
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right" | "bottom";
  children: React.ReactNode;
  title?: string;
}) {
  const initial = side === "left" ? { x: "-100%" } : side === "right" ? { x: "100%" } : { y: "100%" };
  const animate = side === "bottom" ? { y: 0 } : { x: 0 };
  const positionClass =
    side === "left" ? "inset-y-0 left-0 w-[86%] max-w-sm border-r"
    : side === "right" ? "inset-y-0 right-0 w-[86%] max-w-sm border-l"
    : "inset-x-0 bottom-0 h-[92vh] rounded-t-3xl border-t";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm lg:hidden"
          />
          <motion.div
            initial={initial} animate={animate} exit={initial}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className={`fixed z-[56] flex flex-col border-white/10 bg-[#0B0F1B] lg:hidden ${positionClass}`}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {side === "bottom" && (
              <div className="flex justify-center pt-2">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-xs uppercase tracking-wider text-white/50">{title}</span>
              <button onClick={onClose} aria-label="close" className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
