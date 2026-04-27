import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";

import appCss from "../styles.css?url";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OfflineBanner, PWAInstallPrompt } from "@/components/pwa/PWAComponents";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  const stars = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 1.5 + 0.3, delay: Math.random() * 4,
  })), []);
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080B14] px-4 text-white antialiased">
      <div className="pointer-events-none absolute inset-0">
        {stars.map((s) => (
          <motion.div
            key={s.id}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 4, delay: s.delay, repeat: Infinity }}
            className="absolute rounded-full bg-white"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          />
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative max-w-md text-center"
      >
        <h1 className="bg-gradient-to-r from-amber-400 to-blue-400 bg-clip-text text-7xl font-bold text-transparent">404</h1>
        <p className="mt-6 text-xl font-bangla text-white/90">এই পথ হারিয়ে গেছে।</p>
        <p className="mt-2 text-sm text-white/40">The page you are looking for has drifted into the void.</p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 px-5 py-2.5 text-sm font-medium text-amber-200 transition-all hover:scale-[1.02] hover:bg-amber-400/20 active:scale-[0.98]"
          style={{ boxShadow: "0 0 30px rgba(245,158,11,0.2)" }}
        >
          <span className="font-bangla">ফিরে যাও</span>
        </Link>
      </motion.div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#080B14" },
      { title: "অনুধাবন AI — Cognitive Flow Learning" },
      { name: "description", content: "AI-native learning for Bangladesh. বোধ হোক।" },
      { name: "author", content: "অনুধাবন AI" },
      { property: "og:title", content: "অনুধাবন AI" },
      { property: "og:description", content: "Cognitive Flow Learning System for Bangladesh." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const online = useOnlineStatus();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Guard SW: only register in production AND not inside Lovable preview iframe
    const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    const previewHost = window.location.hostname.includes("lovableproject.com")
      || window.location.hostname.includes("lovable.app")
      || window.location.hostname.includes("id-preview--");
    if (inIframe || previewHost || import.meta.env.DEV) {
      // Clean up any stale SWs in preview/dev to avoid stale-cache loops
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      }
      return;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => null);
    }
  }, []);

  return (
    <>
      <OfflineBanner visible={!online} />
      <Outlet />
      <PWAInstallPrompt />
      <Toaster
        position="top-right"
        theme="dark"
        richColors
        closeButton
        visibleToasts={3}
        duration={4000}
      />
    </>
  );
}
