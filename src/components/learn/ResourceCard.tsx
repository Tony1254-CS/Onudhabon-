import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Search as SearchIcon, ChevronDown, ChevronUp, Play, Globe, ShieldCheck } from "lucide-react";

type Tone = "red" | "blue" | "emerald";
const TONE: Record<Tone, { border: string; bg: string; hoverBg: string; accent: string }> = {
  red: { border: "border-red-400/15", bg: "bg-red-400/[0.04]", hoverBg: "hover:bg-red-400/[0.08]", accent: "text-red-300" },
  blue: { border: "border-blue-400/15", bg: "bg-blue-400/[0.04]", hoverBg: "hover:bg-blue-400/[0.08]", accent: "text-blue-300" },
  emerald: { border: "border-emerald-400/15", bg: "bg-emerald-400/[0.04]", hoverBg: "hover:bg-emerald-400/[0.08]", accent: "text-emerald-300" },
};

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/);
      if (m) return m[1];
    }
    return null;
  } catch { return null; }
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function isSearchFallback(url: string): boolean {
  const h = hostOf(url);
  return (
    (h === "youtube.com" && url.includes("/results")) ||
    (h === "google.com" && url.includes("/search"))
  );
}

export function ResourceCard({
  title,
  url,
  description,
  meta,
  tone,
  variant,
  delay = 0,
}: {
  title: string;
  url: string;
  description?: string;
  meta?: string; // channel / source
  tone: Tone;
  variant: "video" | "article" | "practice";
  delay?: number;
}) {
  const [open, setOpen] = useState(false);
  const videoId = useMemo(() => (variant === "video" ? extractYouTubeId(url) : null), [variant, url]);
  const host = hostOf(url);
  const isFallback = isSearchFallback(url);
  const t = TONE[tone];
  const favicon = host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-xl border ${t.border} ${t.bg} ${t.hoverBg} transition overflow-hidden`}
    >
      <div className="p-2.5">
        <div className="flex items-start gap-2.5">
          {/* Thumbnail / favicon */}
          {videoId ? (
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Preview video"
              className="relative shrink-0 h-14 w-20 rounded-md overflow-hidden border border-white/10 group"
            >
              <img
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }}
              />
              <span className="absolute inset-0 grid place-items-center bg-black/30 group-hover:bg-black/10 transition">
                <Play className="w-4 h-4 text-white drop-shadow" fill="white" />
              </span>
            </button>
          ) : (
            <div className="shrink-0 h-9 w-9 rounded-md border border-white/10 bg-black/30 grid place-items-center overflow-hidden">
              {favicon ? (
                <img src={favicon} alt="" className="h-5 w-5" loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).replaceWith(Object.assign(document.createElement("span"), { className: "" })); }} />
              ) : (
                <Globe className="h-4 w-4 text-white/50" />
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white leading-snug line-clamp-2">{title}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {meta && <span className={`text-[10px] ${t.accent}/80 truncate max-w-[50%]`}>{meta}</span>}
              {host && (
                <span className="inline-flex items-center gap-1 text-[10px] text-white/50">
                  <Globe className="h-2.5 w-2.5" /> {host}
                </span>
              )}
              {isFallback ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-200 text-[9px] font-medium">
                  <SearchIcon className="h-2.5 w-2.5" /> খোঁজার ফলাফল
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-200 text-[9px] font-medium">
                  <ShieldCheck className="h-2.5 w-2.5" /> Verified link
                </span>
              )}
            </div>
            {description && (
              <p className="text-[11px] text-white/60 mt-1 leading-relaxed line-clamp-2">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-white/10 hover:bg-white/10 text-[11px] text-white/85 transition"
          >
            <ExternalLink className="h-3 w-3" /> খুলো
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-white/10 hover:bg-white/10 text-[11px] text-white/70 transition"
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {open ? "প্রিভিউ বন্ধ" : "প্রিভিউ"}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-white/5 bg-black/30"
          >
            <div className="p-2.5">
              {videoId ? (
                <div className="relative w-full overflow-hidden rounded-md" style={{ aspectRatio: "16 / 9" }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
                    title={title}
                    className="absolute inset-0 h-full w-full"
                    loading="lazy"
                    allow="accelerated-sensors; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-md border border-white/10 bg-white/[0.02] p-2.5">
                  {favicon ? (
                    <img src={favicon} alt="" className="h-6 w-6 rounded" loading="lazy" />
                  ) : (
                    <Globe className="h-5 w-5 text-white/50" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/85 truncate">{host || url}</p>
                    <p className="text-[10px] text-white/50 truncate">{url}</p>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-white/10 hover:bg-white/10 text-[11px] text-white/85"
                  >
                    <ExternalLink className="h-3 w-3" /> verify
                  </a>
                </div>
              )}
              <p className="mt-1.5 text-[10px] text-white/40 font-bangla">
                {isFallback
                  ? "মূল লিংক পাওয়া যায়নি — এটি একটি অনুসন্ধান ফলাফল।"
                  : "প্রিভিউ লোড হলে লিংকটি কাজ করছে।"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
