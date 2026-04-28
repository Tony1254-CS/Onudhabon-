import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { LogOut, Settings, User as UserIcon, GraduationCap, ChevronDown, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type NavLink = { to: string; label: string };

const PUBLIC_LINKS: NavLink[] = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
];

const STUDENT_LINKS: NavLink[] = [
  { to: "/learn", label: "Learn" },
  { to: "/galaxy", label: "Galaxy" },
  { to: "/classrooms", label: "Classroom" },
  { to: "/student", label: "My Progress" },
];

const TEACHER_LINKS: NavLink[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/classrooms", label: "Classrooms" },
  { to: "/track", label: "Track Students" },
];

const PARENT_LINKS: NavLink[] = [
  { to: "/track", label: "Track Students" },
  { to: "/classrooms", label: "Classrooms" },
];

type Profile = { full_name: string | null; nickname: string | null; role: string | null };

export function Navbar() {
  const { scrollY } = useScroll();
  const blur = useTransform(scrollY, [0, 80], [0, 14]);
  const bg = useTransform(scrollY, [0, 80], ["rgba(8,11,20,0)", "rgba(8,11,20,0.7)"]);
  const border = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0)", "rgba(255,255,255,0.06)"]);
  const [scrolled, setScrolled] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async (uid: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, nickname, role")
        .eq("id", uid)
        .maybeSingle();
      if (mounted) setProfile((data as Profile) || null);
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUserId(session?.user.id || null);
      if (session?.user.id) loadProfile(session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id || null);
      if (session?.user.id) loadProfile(session.user.id);
      else setProfile(null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const displayName = profile?.nickname || profile?.full_name || "তুমি";
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();
  const isTeacher = profile?.role === "teacher";
  const isParent = profile?.role === "parent";
  const roleLinks: NavLink[] = !userId
    ? PUBLIC_LINKS
    : isTeacher
      ? [PUBLIC_LINKS[0], ...TEACHER_LINKS, PUBLIC_LINKS[1]]
      : isParent
        ? [PUBLIC_LINKS[0], ...PARENT_LINKS, PUBLIC_LINKS[1]]
        : [PUBLIC_LINKS[0], ...STUDENT_LINKS, PUBLIC_LINKS[1]];

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
          {userId && (
            <Link
              to={isTeacher ? "/dashboard" : "/student"}
              className="relative px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              activeProps={{ className: "text-[var(--text-primary)]" }}
            >
              {isTeacher ? "Dashboard" : "My Progress"}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {!userId ? (
            <>
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
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-1 pr-2.5 py-1 text-xs text-white hover:bg-white/10 transition-colors"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-blue-500 text-[11px] font-bold text-black">
                  {initial}
                </span>
                <span className="hidden sm:inline max-w-[120px] truncate font-bangla">{displayName}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f1a]/95 p-1.5 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="px-2.5 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-white/40">{isTeacher ? "শিক্ষক" : "শিক্ষার্থী"}</p>
                      <p className="mt-0.5 truncate text-sm font-medium text-white font-bangla">{displayName}</p>
                    </div>
                    <div className="my-1 h-px bg-white/5" />
                    <MenuItem to="/settings" onClick={() => setOpen(false)} icon={Settings} label="প্রোফাইল সেটিংস" />
                    <MenuItem to="/classrooms" onClick={() => setOpen(false)} icon={GraduationCap} label="ক্লাসরুম" />
                    {(profile?.role === "teacher" || profile?.role === "parent") && (
                      <MenuItem to="/track" onClick={() => setOpen(false)} icon={Eye} label="শিক্ষার্থী ট্র্যাক করো" />
                    )}
                    <MenuItem
                      to={isTeacher ? "/dashboard" : "/student"}
                      onClick={() => setOpen(false)}
                      icon={UserIcon}
                      label={isTeacher ? "ড্যাশবোর্ড" : "আমার অগ্রগতি"}
                    />
                    <div className="my-1 h-px bg-white/5" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span className="font-bangla">লগআউট</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      {scrolled && <div className="absolute inset-x-0 -bottom-px h-px bg-[var(--border)]" />}
    </motion.header>
  );
}

function MenuItem({ to, onClick, icon: Icon, label }: { to: string; onClick: () => void; icon: typeof Settings; label: string }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-white/80 hover:bg-white/5 hover:text-white transition-colors"
    >
      <Icon className="h-3.5 w-3.5 opacity-70" />
      <span className="font-bangla">{label}</span>
    </Link>
  );
}
