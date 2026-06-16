import { useEffect } from "react";

type Props = {
  onClose: () => void;
};

export default function AboutScreen({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="About Weeklie"
    >
      <div
        className="w-[min(32rem,calc(100vw-2rem))] bg-surface border border-rule-strong rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono font-semibold text-[20px] tracking-tight">
            <span className="opacity-50">_</span>Weeklie
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close about"
            className="grid place-items-center w-8 h-8 -mr-1 rounded-full text-muted hover:text-ink hover:bg-ink/[0.06] transition"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Weeklie is a minimalist weekly task planner. Plan your week across
          Monday–Sunday columns plus a backlog, drag to reorder, roll over
          unfinished tasks, and reflect with a weekly review — wrapped in a
          warm, paper-quiet interface.
        </p>
      </div>
    </div>
  );
}
