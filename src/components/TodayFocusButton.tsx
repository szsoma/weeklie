type Props = {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
  compact?: boolean;
  tone?: "paper" | "ink";
};

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export default function TodayFocusButton({
  active,
  disabled = false,
  onToggle,
  compact = false,
  tone = "paper",
}: Props) {
  const inactiveClass =
    tone === "ink"
      ? "border-bg/25 text-bg/80 hover:text-bg hover:bg-bg/10"
      : "border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06]";
  const focusOffsetClass = tone === "ink" ? "focus-visible:ring-offset-ink" : "focus-visible:ring-offset-bg";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? "Show full week" : "Focus on today"}
      className={`inline-flex items-center justify-center gap-2 rounded-full border font-mono uppercase transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
        compact ? "h-9 px-3 text-[12px]" : "h-10 px-4 text-[13px]"
      } ${
        active ? "bg-ink text-bg border-ink" : inactiveClass
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 ${focusOffsetClass}`}
    >
      <SunIcon />
      <span>Today</span>
    </button>
  );
}
