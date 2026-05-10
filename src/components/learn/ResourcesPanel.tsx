import { useEffect } from "react";
import { Youtube, FileText, ExternalLink, Sparkles, RefreshCw, WifiOff, AlertCircle, Wrench, CheckCircle2 } from "lucide-react";
import { useTopicResourceLinks } from "@/hooks/useTopicResources";
import { ResourceCard } from "./ResourceCard";

export function ResourcesPanel({ topic, online }: { topic: string; online: boolean }) {
  const { data, loading, error, fromCache, generate } = useTopicResourceLinks(topic);

  useEffect(() => {
    if (topic && !data && !loading && online) generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  if (!topic) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center font-bangla text-xs text-[var(--text-secondary)]/70">
        একটি বিষয় শুরু করো — উপযোগী resources সাজানো হবে।
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-bangla">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-[var(--border)] bg-black/30 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] truncate">
            শেখার Resources
          </span>
          {fromCache && (
            <span className="px-1.5 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[9px] font-medium inline-flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" /> Offline
            </span>
          )}
        </div>
        <button
          onClick={() => generate(true)}
          disabled={loading || !online}
          title={online ? "নতুন resources" : "অফলাইনে regenerate করা যাবে না"}
          className="p-1.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 text-sm">
        {!data && loading && (
          <div className="flex flex-col items-center justify-center text-center gap-3 text-xs text-[var(--text-secondary)] py-10">
            <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
            Resources খোঁজা হচ্ছে…
          </div>
        )}

        {!data && !loading && error === "offline_no_cache" && (
          <div className="flex flex-col items-center justify-center text-center gap-3 text-xs text-[var(--text-secondary)] px-4 py-10">
            <WifiOff className="w-6 h-6 text-white/40" />
            অফলাইনে এই বিষয়ের resources নেই।
          </div>
        )}

        {!data && !loading && error && error !== "offline_no_cache" && (
          <div className="flex flex-col items-center justify-center text-center gap-3 text-xs text-red-300/80 px-4 py-10">
            <AlertCircle className="w-6 h-6" />
            Resources লোড করা যায়নি।
            <button onClick={() => generate(true)} className="mt-1 px-3 py-1.5 rounded-md border border-white/15 hover:bg-white/10 text-white/80 text-[11px]">
              আবার চেষ্টা করো
            </button>
          </div>
        )}

        {data?.videos && data.videos.length > 0 && (
          <section>
            <h4 className="flex items-center gap-2 text-xs font-semibold text-white/90 mb-2">
              <Youtube className="w-3.5 h-3.5 text-red-400" /> ভিডিও
            </h4>
            <div className="space-y-2">
              {data.videos.map((v, i) => (
                <ResourceCard
                  key={`v-${i}`}
                  title={v.title}
                  url={v.url}
                  description={v.description}
                  meta={v.channel ? `▶ ${v.channel}` : undefined}
                  tone="red"
                  variant="video"
                  delay={i * 0.04}
                />
              ))}
            </div>
          </section>
        )}

        {data?.articles && data.articles.length > 0 && (
          <section>
            <h4 className="flex items-center gap-2 text-xs font-semibold text-white/90 mb-2">
              <FileText className="w-3.5 h-3.5 text-blue-400" /> প্রবন্ধ ও পড়ার উপাদান
            </h4>
            <div className="space-y-2">
              {data.articles.map((a, i) => (
                <ResourceCard
                  key={`a-${i}`}
                  title={a.title}
                  url={a.url}
                  description={a.description}
                  meta={a.source ? `📰 ${a.source}` : undefined}
                  tone="blue"
                  variant="article"
                  delay={i * 0.04}
                />
              ))}
            </div>
          </section>
        )}

        {data?.practice && data.practice.length > 0 && (
          <section>
            <h4 className="flex items-center gap-2 text-xs font-semibold text-white/90 mb-2">
              <Wrench className="w-3.5 h-3.5 text-emerald-400" /> অনুশীলন ও সিমুলেশন
            </h4>
            <div className="space-y-2">
              {data.practice.map((p, i) => (
                <ResourceCard
                  key={`p-${i}`}
                  title={p.title}
                  url={p.url}
                  description={p.description}
                  tone="emerald"
                  variant="practice"
                  delay={i * 0.04}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
