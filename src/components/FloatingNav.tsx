import { useState } from "react";
import { useHideOnScroll } from "../hooks/useHideOnScroll";
import { useTheme, type ThemeMode } from "../hooks/useTheme";

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

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

type Props = {
  isAuthenticated?: boolean;
  onLogout?: () => void;
  onShowAbout?: () => void;
  onShowFeatures?: () => void;
  onOpenQuickCapture?: () => void;
};

export default function FloatingNav({
  isAuthenticated = false,
  onLogout,
  onShowAbout,
  onShowFeatures,
  onOpenQuickCapture,
}: Props) {
  const [open, setOpen] = useState(false);
  const hidden = useHideOnScroll(".weekgrid");
  const { theme, setTheme } = useTheme();

  const linkClass =
    "block text-left font-mono text-[13px] uppercase opacity-70 hover:opacity-100 py-3 transition focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-ink/20 backdrop-blur-[4px] transition-opacity duration-200 ${
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
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="font-mono text-[13px] uppercase opacity-70">
              Theme
            </span>
            <div
              className="grid grid-cols-3 rounded-full bg-ink/[0.055] p-1"
              aria-label="Theme mode"
            >
              {THEME_OPTIONS.map((option) => {
                const active = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={active}
                    aria-label={`Set theme to ${option.label}`}
                    className={`rounded-full px-2.5 py-1.5 font-mono text-[11px] uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 ${
                      active
                        ? "bg-ink text-bg shadow-sm"
                        : "text-muted hover:bg-ink/[0.06] hover:text-ink"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onShowFeatures?.();
              setOpen(false);
            }}
            className={linkClass}
          >
            Features
          </button>
          <div className="h-px bg-rule my-1" />
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                onLogout?.();
                setOpen(false);
              }}
              className={linkClass}
            >
              Logout
            </button>
          ) : (
            <>
              <a
                href="#login"
                onClick={() => setOpen(false)}
                className={linkClass}
              >
                Login
              </a>
              <a
                href="#signup"
                onClick={() => setOpen(false)}
                className={linkClass}
              >
                Sign up
              </a>
            </>
          )}
        </div>
      </nav>

      {/* Floating pill bar */}
      <div
        className={`fixed z-50 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] left-4 w-[calc(100%-6rem)] sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(24rem,calc(100%-7rem))] bg-ink text-bg rounded-full shadow-xl border border-ink/5 transition-all duration-300 ${
          hidden
            ? "translate-y-[150%] opacity-0 pointer-events-none"
            : "opacity-100"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          {/* Wordmark */}
          <a
            href="#"
            className="inline-flex items-center gap-1 font-mono font-semibold text-[16px] tracking-tight text-bg whitespace-nowrap shrink-0 hover:opacity-80 transition"
          >
            <Checkmark />
            <span className="opacity-50">_</span>Weekly
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

      <button
        type="button"
        onClick={onOpenQuickCapture}
        aria-label="Open quick capture"
        className={`fixed z-[60] right-[calc(env(safe-area-inset-right,0px)+16px)] bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] grid h-14 w-14 place-items-center rounded-full bg-ink text-bg shadow-xl border border-ink/5 transition-all duration-300 hover:bg-ink/90 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
          hidden
            ? "translate-y-[150%] opacity-0 pointer-events-none"
            : "opacity-100"
        }`}
      >
        <span className="text-[30px] leading-none">+</span>
      </button>
    </>
  );
}
