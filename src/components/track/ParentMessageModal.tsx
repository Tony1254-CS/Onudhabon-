import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  parentId: string;
};

export function ParentMessageModal({ open, onClose, studentId, studentName, parentId }: Props) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const body = message.trim();
    if (!body) return;
    setSending(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: studentId,
        type: "teacher_message",
        message: body,
        created_by: parentId,
      } as any);
      if (error) throw error;
      toast.success(`${studentName}-কে বার্তা পাঠানো হয়েছে।`);
      setMessage("");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("বার্তা পাঠানো যায়নি।");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0C1020] p-6 shadow-2xl"
            style={{ boxShadow: "0 0 60px rgba(59,130,246,0.15)" }}
          >
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white font-bangla">বার্তা পাঠাও</h2>
                <p className="mt-0.5 text-sm text-white/40 font-bangla">{studentName}-কে একটি বার্তা পাঠাও</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="তোমার বার্তা লেখো…"
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-blue-400/50 transition-colors font-bangla"
            />

            {/* Actions */}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-white/50 hover:text-white transition-colors font-bangla"
              >
                বাতিল
              </button>
              <button
                onClick={send}
                disabled={!message.trim() || sending}
                className="flex items-center gap-2 rounded-lg bg-blue-500/20 border border-blue-400/30 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/30 disabled:opacity-40 transition-all font-bangla"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                পাঠাও
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
