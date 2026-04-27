const STATE_ICON: Record<string, string> = {
  focused: "🎯", confused: "😕", overloaded: "🥵", disengaged: "💤", "mastery-ready": "✨",
};
const STATE_COLOR: Record<string, string> = {
  focused: "#F59E0B", confused: "#FB923C", overloaded: "#EF4444", disengaged: "#6B7280", "mastery-ready": "#10B981",
};

export type TimelineEntry = {
  id: string;
  date: string;
  topic: string;
  mastery: number;
  state: string | null;
};

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) {
    return <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50">কোনো সেশন রেকর্ড নেই।</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-white/10 pl-5">
      {entries.map((e) => {
        const color = STATE_COLOR[e.state || "focused"];
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#080B14] text-xs" style={{ background: color }}>
              {STATE_ICON[e.state || "focused"]}
            </span>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-white/50">
                <span>{new Date(e.date).toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}</span>
                <span className="tabular-nums" style={{ color }}>+{Math.round(e.mastery * 100)}%</span>
              </div>
              <p className="mt-1 text-sm font-medium text-white">{e.topic}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
