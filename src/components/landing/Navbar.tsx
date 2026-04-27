import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useEffect } from "react";

const links = [
  { to: "/", label: "Home" },
  { to: "/learn", label: "Learn" },
  { to: "/galaxy", label: "Galaxy" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/about", label: "About" },
] as const;

export function Navbar() {
  const { scrollY } = useScroll();
  const blur = useTransform(scrollY, [0, 80], [0, 14]);
  const bg = useTransform(scrollY, [0, 80], ["rgba(8,11,20,0)", "rgba(8,11,20,0.7)"]);
  const border = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0)", "rgba(255,255,255,0.06)"]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      style={{
        backdropFilter: blur.get() ? `blur(${blur.get()}px)` : undefined,
        backgroundColor: bg,
        borderBottom: "1px solid",
        borderColor: border,
      }}
      className="fixed top-0 inset-x-0 z-50 transition-all"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-1.5 group">
          <span className="font-display text-2xl font-semibold tracking-tight font-bangla">
            অনুধাবন
          </span>
          <span className="text-sm font-bold tracking-widest text-[var(--accent-cold-blue)] group-hover:text-[var(--accent-blue)] transition-colors">
            AI
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="relative px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              activeProps={{ className: "text-[var(--text-primary)]" }}
              activeOptions={{ exact: true }}
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-x-3 -bottom-px h-px bg-[var(--accent-cold-blue)]"
                    />
                  )}
                </>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/demo"
            className="hidden sm:inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium border border-[var(--accent-gold)]/60 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)] hover:text-[var(--bg-primary)] transition-all"
          >
            Demo Tour
          </Link>
          <Link
            to="/login"
            className="hidden sm:inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-bangla"
          >
            লগইন
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[var(--accent-blue)] hover:bg-[var(--accent-cold-blue)] transition-all hover:shadow-[0_0_24px_0_rgba(59,130,246,0.55)] font-bangla"
          >
            শুরু করো
          </Link>
        </div>
      </div>
      {/* Static fallback border for clients without backdrop-filter momentum */}
      {scrolled && <div className="absolute inset-x-0 -bottom-px h-px bg-[var(--border)]" />}
    </motion.header>
  );
}
