import { useState } from "react";

function Hamburger({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M6 18L18 6" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

function Checkmark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[18px] h-[18px] shrink-0"
      aria-hidden
    >
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

type Props = {
  onShowAbout?: () => void;
};

export default function FloatingNav({ onShowAbout }: Props) {
  const [open, setOpen] = useState(false);

  const linkClass =
    "block font-mono text-[13px] uppercase opacity-70 hover:opacity-100 py-3 transition focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Menu panel — anchored above the pill */}
      <nav
        className={`fixed z-50 bottom-[calc(env(safe-area-inset-bottom,0px)+76px)] left-1/2 -translate-x-1/2 w-[min(22rem,calc(100vw-2rem))] bg-surface border border-rule-strong rounded-2xl shadow-lg overflow-hidden transition-all duration-250 ease-out origin-bottom ${
          open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-2 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div className="flex flex-col px-6 py-2">
          <button
            type="button"
            onClick={() => {
              onShowAbout?.();
              setOpen(false);
            }}
            className="block w-full text-left font-mono text-[13px] uppercase opacity-70 hover:opacity-100 py-3 transition focus-visible:outline-none focus-visible:opacity-100"
          >
            About
          </button>
          <a href="#features" onClick={() => setOpen(false)} className={linkClass}>
            Features
          </a>
          <div className="h-px bg-rule my-1" />
          <a href="#login" onClick={() => setOpen(false)} className={linkClass}>
            Login
          </a>
          <a href="#signup" onClick={() => setOpen(false)} className={linkClass}>
            Sign up
          </a>
        </div>
      </nav>

      {/* Floating pill bar */}
      <div
        className="fixed z-50 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] left-1/2 -translate-x-1/2 w-[min(24rem,calc(100%-2rem))] bg-ink text-bg rounded-full shadow-xl border border-ink/5"
      >
        <div className="flex items-center justify-between px-4 py-3">
          {/* Wordmark */}
          <a
            href="#"
            className="inline-flex items-center gap-1 font-mono font-semibold text-[16px] tracking-tight text-bg whitespace-nowrap shrink-0 hover:opacity-80 transition"
          >
            <Checkmark />
            <span className="opacity-50">_</span>Weeklie
          </a>

          {/* Burger button */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid place-items-center w-10 h-10 -mr-1 rounded-full text-bg hover:bg-bg/10 active:scale-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg/20 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <Hamburger open={open} />
          </button>
        </div>
      </div>
    </>
  );
}
