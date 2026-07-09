import { useState } from "react";

function Hamburger() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[22px] h-[22px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

type Props = {
  isAuthenticated?: boolean;
  onLogout?: () => void;
};

export default function SiteHeader({
  isAuthenticated = false,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);

  const linkClass =
    "font-mono text-[13px] uppercase opacity-70 hover:opacity-100 transition";

  return (
    <header className="bg-ink text-bg">
      <div className="flex items-center justify-between px-4 md:px-10 py-4">
        {/* Wordmark */}
        <a
          href="#"
          className="inline-flex items-center shrink-0 hover:opacity-80 transition"
          aria-label="Weekly"
        >
          <img
            src="/weekly-logo.svg"
            alt="Weekly"
            className="h-[20px] md:h-[22px] w-auto"
          />
        </a>

        {/* Desktop nav — section anchors + auth actions */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#about" className={linkClass}>
            About
          </a>
          <a href="#features" className={linkClass}>
            Features
          </a>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onLogout?.()}
              className="font-mono text-[13px] uppercase hover:opacity-80 transition"
            >
              Logout
            </button>
          ) : (
            <>
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
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Toggle menu"
          className="md:hidden grid place-items-center w-10 h-10 -mr-1 rounded-md text-bg hover:bg-bg/10 active:scale-95 transition"
        >
          <Hamburger />
        </button>
      </div>

      {/* Mobile slide-down panel — always mounted, height/opacity transition */}
      <nav
        id="mobile-nav"
        className={`md:hidden overflow-hidden bg-ink text-bg transition-[max-height,opacity] duration-200 ease-out ${
          open ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="px-4 py-4 flex flex-col gap-1">
          <a
            href="#about"
            onClick={() => setOpen(false)}
            className="font-mono text-[14px] uppercase py-2.5 opacity-80 hover:opacity-100 transition"
          >
            About
          </a>
          <a
            href="#features"
            onClick={() => setOpen(false)}
            className="font-mono text-[14px] uppercase py-2.5 opacity-80 hover:opacity-100 transition"
          >
            Features
          </a>

          <div className="h-px bg-bg/10 my-2" />

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  onLogout?.();
                  setOpen(false);
                }}
                className="flex-1 font-mono text-[13px] uppercase h-10 px-4 inline-flex items-center justify-center rounded-md border border-bg/20 hover:bg-bg/10 active:scale-[0.98] transition"
              >
                Logout
              </button>
            ) : (
              <>
                <a
                  href="#login"
                  onClick={() => setOpen(false)}
                  className="flex-1 font-mono text-[13px] uppercase h-10 px-4 inline-flex items-center justify-center rounded-md border border-bg/20 hover:bg-bg/10 active:scale-[0.98] transition"
                >
                  Login
                </a>
                <a
                  href="#signup"
                  onClick={() => setOpen(false)}
                  className="flex-1 font-mono text-[13px] uppercase h-10 px-4 inline-flex items-center justify-center bg-bg text-ink rounded-md hover:opacity-80 active:scale-[0.98] transition"
                >
                  Sign up
                </a>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
