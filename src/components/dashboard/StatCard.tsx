import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, suffix, icon: Icon, accent = "#3B82F6", pulse = false,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  accent?: string;
  pulse?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
      style={{ boxShadow: `0 10px 40px -20px ${accent}40` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">
            {value}
            {suffix && <span className="ml-1 text-base text-white/60">{suffix}</span>}
          </p>
        </div>
        <div
          className="relative flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `${accent}20`, color: accent }}
        >
          <Icon className="h-5 w-5" />
          {pulse && (
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: accent }} />
              <span className="relative inline-flex h-3 w-3 rounded-full" style={{ background: accent }} />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function MasteryRing({ value, size = 44, color = "#F59E0B" }: { value: number; size?: number; color?: string }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={3} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={3} fill="none" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - c * pct }}
        transition={{ duration: 1, ease: "easeOut" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.28} fill="white" fontWeight={600}>
        {Math.round(pct * 100)}
      </text>
    </svg>
  );
}
