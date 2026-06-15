import { useStore } from "../store";
import { formatWeekLabel, getWeekStart, nextWeek, prevWeek } from "../dates";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-[20px] h-[20px] ${direction === "left" ? "" : "rotate-180"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[20px] h-[20px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="2.4" />
      {hidden && <path d="M4 4l16 16" />}
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[20px] h-[20px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[20px] h-[20px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

type Props = {
  onShowReview?: () => void;
};

export default function WeekHeader({ onShowReview }: Props) {
  const currentWeekStart = useStore((s) => s.currentWeekStart);
  const setCurrentWeekStart = useStore((s) => s.setCurrentWeekStart);
  const hideDone = useStore((s) => s.hideDone);
  const setHideDone = useStore((s) => s.setHideDone);
  const doneCount = useStore((s) => s.tasks.filter((t) => t.done).length);

  const goToToday = () => setCurrentWeekStart(getWeekStart(new Date()));

  return (
    <header className="flex items-center justify-between px-7 md:px-10 py-6 border-b-2 border-rule">
      <div className="flex items-center gap-4 md:gap-6">
        <button
          onClick={() => setCurrentWeekStart(prevWeek(currentWeekStart))}
          aria-label="Previous week"
          className="grid place-items-center w-10 h-10 -ml-2 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition"
        >
          <Chevron direction="left" />
        </button>

        <div className="flex flex-col min-w-0 items-center text-center md:w-[280px]">
          <span className="font-mono text-[12px] uppercase text-faint leading-none mb-1.5">
            Week
          </span>
          <h1 className="font-mono font-semibold text-[26px] md:text-[30px] tracking-tight leading-none whitespace-nowrap">
            {formatWeekLabel(currentWeekStart)}
          </h1>
        </div>

        <button
          onClick={() => setCurrentWeekStart(nextWeek(currentWeekStart))}
          aria-label="Next week"
          className="grid place-items-center w-10 h-10 -mr-2 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition"
        >
          <Chevron direction="right" />
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Hide done — icon on mobile, text on desktop; done-count badge when hidden */}
        <button
          onClick={() => setHideDone(!hideDone)}
          aria-pressed={hideDone}
          aria-label={
            hideDone
              ? doneCount
                ? `Show ${doneCount} done task${doneCount === 1 ? "" : "s"}`
                : "Show done tasks"
              : "Hide done tasks"
          }
          className={`relative h-10 font-mono text-[14px] uppercase rounded-md border transition active:scale-[0.98] ${
            hideDone
              ? "bg-ink text-bg border-ink"
              : "border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06]"
          }`}
        >
          <span className="md:hidden inline-flex items-center justify-center w-10 h-10 -mx-4">
            <EyeIcon hidden={hideDone} />
          </span>
          <span className="hidden md:inline px-4">
            {hideDone
              ? `Show done${doneCount ? ` ${doneCount}` : ""}`
              : "Hide done"}
          </span>
          {hideDone && doneCount > 0 && (
            <span className="md:hidden absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 grid place-items-center bg-amber-400 text-ink text-[11px] font-semibold rounded-full leading-none ring-2 ring-bg">
              {doneCount}
            </span>
          )}
        </button>

        {/* Today */}
        <button
          onClick={goToToday}
          aria-label="Jump to today"
          className="h-10 w-10 md:w-auto font-mono text-[14px] uppercase rounded-md border border-rule-strong text-ink hover:bg-ink/[0.06] active:scale-[0.98] transition"
        >
          <span className="md:hidden inline-flex items-center justify-center w-10 h-10 -mx-4">
            <CalendarIcon />
          </span>
          <span className="hidden md:inline px-4">Today</span>
        </button>

        {/* Review */}
        <button
          onClick={onShowReview}
          aria-label="Open weekly review"
          className="h-10 w-10 md:w-auto font-mono text-[14px] uppercase rounded-md border border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-[0.98] transition"
        >
          <span className="md:hidden inline-flex items-center justify-center w-10 h-10 -mx-4">
            <ReviewIcon />
          </span>
          <span className="hidden md:inline px-4">Review</span>
        </button>
      </div>
    </header>
  );
}
