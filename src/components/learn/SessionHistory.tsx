import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, Clock, BookOpen, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SessionRow = {
  id: string;
  topic: string | null;
  cognitive_state: string | null;
  mastery_score: number | null;
  messages: any;
  created_at: string;
  updated_at: string;
};

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "এইমাত্র";
  if (d < 3600) return `${Math.floor(d / 60)} মি আগে`;
  if (d < 86400) return `${Math.floor(d / 3600)} ঘ আগে`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)} দিন আগে`;
  return new Date(iso).toLocaleDateString("bn-BD");
}

export function SessionHistoryButton({
  userId,
  currentSessionId,
  onResume,
}: {
  userId: string | null;
  currentSessionId: string | null;
  onResume: (s: SessionRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sessions")
      .select("id, topic, cognitive_state, mastery_score, messages, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30);
    setLoading(false);
    if (error) { toast.error("ইতিহাস লোড করা যায়নি"); return; }
    setRows((data ?? []) as SessionRow[]);
  };

  useEffect(() => { if (open) refresh(); /* eslint-disable-next-line */ }, [open, userId]);

  const deleteOne = async (id: string) => {
    setRows((p) => p.filter((r) => r.id !== id));
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) { toast.error("মুছে ফেলা যায়নি"); refresh(); }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="পূর্ববর্তী সেশন"
        className="p-1.5 rounded-full border border-[var(--border)] bg-white/[0.04] text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)] flex items-center gap-1 text-xs transition-colors"
      >
        <History className="w-3.5 h-3.5" />
        <span className="hidden sm:inline pr-1 font-bangla">ইতিহাস</span>
      </button>

      {typeof document !== "undefined" && createPortal(
      <AnimatePresence>

        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 z-50 h-full w-full sm:w-[380px] bg-[var(--bg-secondary)] border-l border-[var(--border)] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[var(--accent-gold)]" />
                  <h3 className="font-bangla text-sm">পূর্ববর্তী সেশন</h3>
                </div>
                <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-white/10 text-[var(--text-secondary)]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {loading && <p className="text-xs text-center text-[var(--text-secondary)] py-8 font-bangla">লোড হচ্ছে…</p>}
                {!loading && rows.length === 0 && (
                  <p className="text-xs text-center text-[var(--text-secondary)]/70 py-12 font-bangla leading-relaxed px-4">
                    কোনো পূর্ববর্তী সেশন নেই। একটি বিষয় বেছে শেখা শুরু করো — তোমার অগ্রগতি এখানে সংরক্ষিত থাকবে।
                  </p>
                )}
                <ul className="space-y-2">
                  {rows.map((r) => {
                    const msgCount = Array.isArray(r.messages) ? r.messages.length : 0;
                    const mastery = Math.round((r.mastery_score ?? 0) * 100);
                    const isActive = currentSessionId === r.id;
                    return (
                      <li
                        key={r.id}
                        className={`group rounded-lg border p-3 transition-colors ${
                          isActive
                            ? "border-[var(--accent-gold)]/50 bg-[var(--accent-gold)]/[0.06]"
                            : "border-[var(--border)] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        <button
                          onClick={() => { onResume(r); setOpen(false); }}
                          className="w-full text-left"
                        >
                          <div className="flex items-start gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-[var(--accent-gold)] mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bangla text-sm text-[var(--text-primary)] truncate">
                                {r.topic || "সরাসরি চ্যাট"}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-secondary)] tabular-nums">
                                <Clock className="w-3 h-3" />
                                <span>{timeAgo(r.updated_at)}</span>
                                <span>·</span>
                                <span className="font-bangla">{msgCount} বার্তা</span>
                                {mastery > 0 && (
                                  <>
                                    <span>·</span>
                                    <span className="text-[var(--accent-gold)]">{mastery}%</span>
                                  </>
                                )}
                                {isActive && (
                                  <span className="ml-auto text-[var(--accent-gold)] font-bangla">চলমান</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteOne(r.id); }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" /> মুছে ফেলো
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
