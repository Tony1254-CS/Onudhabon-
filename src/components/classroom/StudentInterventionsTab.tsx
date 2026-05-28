import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BookOpen, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Intervention = {
  id: string;
  concept: string;
  subject: string | null;
  severity: string;
  intervention_type: string;
  suggested_action: string;
  status: string;
  student_response: string | null;
  submitted_at: string | null;
  assigned_at: string;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  intervention_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function StudentInterventionsTab({ studentId }: { studentId: string }) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: ivs }, { data: ns }] = await Promise.all([
        supabase
          .from("interventions")
          .select("id, concept, subject, severity, intervention_type, suggested_action, status, student_response, submitted_at, assigned_at")
          .eq("student_id", studentId)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("notifications")
          .select("id, type, title, body, intervention_id, read_at, created_at")
          .eq("user_id", studentId)
          .eq("type", "intervention_assigned")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (!mounted) return;
      setInterventions((ivs || []) as Intervention[]);
      setNotifications((ns || []) as Notification[]);
      setLoading(false);

      // Mark unread intervention notifications as read on view
      const unreadIds = (ns || []).filter((n) => !n.read_at).map((n) => n.id);
      if (unreadIds.length) {
        await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
      }
    })();
    return () => { mounted = false; };
  }, [studentId]);

  const submitIntervention = async (iv: Intervention, response: string) => {
    const now = new Date().toISOString();
    setInterventions((p) => p.map((x) => (x.id === iv.id ? { ...x, status: "submitted", student_response: response, submitted_at: now } : x)));
    const { error } = await supabase.rpc("submit_intervention_response", { _id: iv.id, _response: response });
    if (error) {
      toast.error("জমা দেওয়া যায়নি");
      return;
    }
    toast.success("শিক্ষককে পাঠানো হয়েছে!");
  };

  const startIntervention = async (iv: Intervention) => {
    if (iv.status !== "assigned") return;
    setInterventions((p) => p.map((x) => (x.id === iv.id ? { ...x, status: "in_progress" } : x)));
    await supabase.rpc("start_intervention", { _id: iv.id });
  };

  const recentNotifs = useMemo(() => notifications.slice(0, 3), [notifications]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">লোড হচ্ছে…</p>;
  }

  return (
    <div className="space-y-4">
      {recentNotifs.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-200">
            <Bell className="h-3.5 w-3.5" /> সাম্প্রতিক নোটিফিকেশন
          </p>
          <ul className="space-y-1.5">
            {recentNotifs.map((n) => (
              <li key={n.id} className="text-xs text-white/80">
                <span className="font-medium">{n.title}</span>
                {n.body && <span className="text-white/50"> — {n.body}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {interventions.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center text-sm text-white/40">
          এখনো কোনো হস্তক্ষেপ অ্যাসাইন করা হয়নি।
        </p>
      ) : (
        <ul className="space-y-3">
          {interventions.map((iv) => (
            <InterventionCard key={iv.id} iv={iv} onStart={startIntervention} onSubmit={submitIntervention} />
          ))}
        </ul>
      )}
    </div>
  );
}

function InterventionCard({
  iv,
  onStart,
  onSubmit,
}: {
  iv: Intervention;
  onStart: (iv: Intervention) => void;
  onSubmit: (iv: Intervention, response: string) => void;
}) {
  const [open, setOpen] = useState(iv.status === "assigned" || iv.status === "in_progress");
  const [response, setResponse] = useState(iv.student_response || "");
  const sevColor =
    iv.severity === "critical" ? "#EF4444" :
    iv.severity === "high" ? "#F59E0B" :
    iv.severity === "medium" ? "#3B82F6" : "#10B981";
  const statusLabel: Record<string, string> = {
    assigned: "নতুন",
    in_progress: "চলমান",
    submitted: "জমা দেওয়া হয়েছে",
    completed: "সম্পন্ন",
    improved: "উন্নতি হয়েছে",
    retry: "পুনরায় চেষ্টা",
  };
  const isDone = iv.status === "submitted" || iv.status === "completed" || iv.status === "improved";

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition-[box-shadow] hover:shadow-lg">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 text-left">
        <span
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${sevColor}22`, color: sevColor }}
          aria-hidden
        >
          <Bell className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">{iv.concept}</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: `${sevColor}1A`, color: sevColor }}
            >
              {statusLabel[iv.status] || iv.status}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-white/60">{iv.suggested_action}</p>
          <p className="mt-1 text-[10px] text-white/40">
            {new Date(iv.assigned_at).toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}
            {iv.subject ? ` · ${iv.subject}` : ""}
          </p>
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          {!isDone ? (
            <>
              <label className="block text-[11px] uppercase tracking-wider text-white/50">তোমার উত্তর / কাজ</label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                onFocus={() => onStart(iv)}
                rows={3}
                placeholder="তুমি যা শিখেছ বা যে কাজটা করেছ এখানে লেখো…"
                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-500/40"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/learn"
                  search={{ topic: iv.concept }}
                  className="flex items-center gap-1 rounded-md bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-200 hover:bg-blue-500/30"
                >
                  <BookOpen className="h-3 w-3" /> অনুশীলন করো
                </Link>
                <button
                  onClick={() => onSubmit(iv, response.trim())}
                  disabled={!response.trim()}
                  className="flex items-center gap-1 rounded-md bg-emerald-500/25 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/35 disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3 w-3" /> শিক্ষককে জমা দাও
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-wider text-white/50">তোমার জমা দেওয়া উত্তর</p>
              <p className="rounded-lg bg-white/5 p-2.5 text-sm text-white/80">{iv.student_response || "—"}</p>
              {iv.submitted_at && (
                <p className="text-[10px] text-white/40">
                  জমা: {new Date(iv.submitted_at).toLocaleString("bn-BD")}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
