import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="relative border-t border-[var(--border)] py-14 px-6">
      <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
        <Link to="/" className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bangla">অনুধাবন</span>
            <span className="text-sm font-bold tracking-widest text-[var(--accent-cold-blue)]">AI</span>
          </div>
          <span className="text-sm text-[var(--text-secondary)] font-bangla">বোধ হোক।</span>
        </Link>

        <p className="text-xs text-[var(--text-secondary)] tracking-wide text-center">
          Built for Bangladesh. Designed for the World.
        </p>

        <div className="flex items-center gap-5 text-xs text-[var(--text-secondary)]">
          <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Privacy</a>
          <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Terms</a>
          <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
