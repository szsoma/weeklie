export default function SiteHeader() {
  return (
    <header className="flex items-center justify-between px-7 md:px-10 py-4 bg-ink text-bg">
      {/* Wordmark — checkmark glyph + terminal-style underscore cursor */}
      <a
        href="#"
        className="inline-flex tracking-[-0.02em] items-center gap-1 font-mono font-semibold text-[18px] tracking-tight text-bg whitespace-nowrap shrink-0 hover:opacity-80 transition"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[18px] h-[18px]"
          aria-hidden
        >
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
        <span className="opacity-50">_</span>Weeklie
      </a>

      {/* Nav — section anchors + auth actions */}
      <nav className="flex items-center gap-4 md:gap-6">
        <a
          href="#about"
          className="font-mono text-[13px] uppercase opacity-70 hover:opacity-100 transition"
        >
          About
        </a>
        <a
          href="#features"
          className="font-mono text-[13px] uppercase opacity-70 hover:opacity-100 transition"
        >
          Features
        </a>
        <a
          href="#login"
          className="font-mono text-[13px] uppercase hover:opacity-80 transition"
        >
          Login
        </a>
        <a
          href="#signup"
          className="font-mono text-[13px] uppercase h-9 px-4 inline-flex items-center bg-bg text-ink rounded-md hover:opacity-80 active:scale-[0.98] transition"
        >
          Sign up
        </a>
      </nav>
    </header>
  );
}
