import { useState } from "react";
import { useStore } from "../store";
import {
  formatDate,
  formatWeekLabel,
  getWeekDays,
  nextWeek,
  prevWeek,
} from "../dates";
import WeekIntention from "./WeekIntention";

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

function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[20px] h-[20px]"
      fill="currentColor"
      stroke="none"
      aria-hidden
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

type Props = {
  onShowReview?: () => void;
};

export default function WeekHeader({
  onShowReview,
}: Props) {
  const currentWeekStart = useStore((s) => s.currentWeekStart);
  const setCurrentWeekStart = useStore((s) => s.setCurrentWeekStart);
  const hideDone = useStore((s) => s.hideDone);
  const setHideDone = useStore((s) => s.setHideDone);
  const doneCount = useStore((s) => s.tasks.filter((t) => t.done).length);
  const tasks = useStore((s) => s.tasks);
  const copyLastWeekTasks = useStore((s) => s.copyLastWeekTasks);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCopyingLastWeek, setIsCopyingLastWeek] = useState(false);

  const previousWeekStart = prevWeek(currentWeekStart);
  const previousWeekDates = new Set(getWeekDays(previousWeekStart).map(formatDate));
  const previousUndoneCount = tasks.filter(
    (task) => task.date !== null && previousWeekDates.has(task.date) && !task.done,
  ).length;

  const handleCopyLastWeek = async () => {
    if (isCopyingLastWeek || previousUndoneCount === 0) return;
    setIsCopyingLastWeek(true);
    await copyLastWeekTasks();
    setIsCopyingLastWeek(false);
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 border-b-2 border-rule">
        <div className="flex flex-col min-w-0 items-start text-left md:w-[280px]">
          <span className="font-mono text-[11px] uppercase text-muted tracking-[0.08em] leading-none mb-1">
            Week
          </span>
          <h1 className="font-mono font-semibold text-[24px] md:text-[22px] tracking-tight leading-none whitespace-nowrap">
            {formatWeekLabel(currentWeekStart)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeekStart(prevWeek(currentWeekStart))}
            aria-label="Previous week"
            className="grid place-items-center w-10 h-10 rounded-lg text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <Chevron direction="left" />
          </button>

          <button
            onClick={() => setCurrentWeekStart(nextWeek(currentWeekStart))}
            aria-label="Next week"
            className="grid place-items-center w-10 h-10 rounded-lg text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <Chevron direction="right" />
          </button>

          <div className="hidden md:flex items-center gap-2">
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
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
            >
              <span className="hidden md:inline px-4">
                {hideDone
                  ? `Show done${doneCount ? ` ${doneCount}` : ""}`
                  : "Hide done"}
              </span>
            </button>

            <button
              onClick={handleCopyLastWeek}
              disabled={isCopyingLastWeek || previousUndoneCount === 0}
              title={previousUndoneCount === 0 ? "No tasks to copy" : "Copy undone tasks from last week"}
              className="h-10 w-auto font-mono text-[14px] uppercase rounded-md border border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <span className="hidden md:inline px-4">
                {isCopyingLastWeek ? "Copying" : "Copy last week"}
              </span>
            </button>

            <button
              onClick={onShowReview}
              aria-label="Open weekly review"
              className="h-10 w-auto font-mono text-[14px] uppercase rounded-md border border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <span className="hidden md:inline px-4">Review</span>
            </button>
          </div>

          <div className="relative md:hidden">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="More actions"
              className="grid place-items-center w-10 h-10 rounded-lg text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <MoreIcon />
            </button>

            {menuOpen && (
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
            )}

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-[45] w-52 bg-surface border border-rule-strong rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => {
                    setHideDone(!hideDone);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 font-mono text-[14px] text-ink hover:bg-ink/[0.06] transition"
                >
                  <EyeIcon hidden={hideDone} />
                  <span>
                    {hideDone
                      ? `Show done${doneCount ? ` (${doneCount})` : ""}`
                      : "Hide done"}
                  </span>
                </button>

                <button
                  onClick={async () => {
                    await handleCopyLastWeek();
                    setMenuOpen(false);
                  }}
                  disabled={isCopyingLastWeek || previousUndoneCount === 0}
                  className="flex items-center gap-3 w-full px-4 py-3 font-mono text-[14px] text-ink hover:bg-ink/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <CalendarIcon />
                  <span>{isCopyingLastWeek ? "Copying" : "Copy last week"}</span>
                </button>

                <button
                  onClick={() => {
                    onShowReview?.();
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 font-mono text-[14px] text-ink hover:bg-ink/[0.06] transition"
                >
                  <ReviewIcon />
                  <span>Review</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <WeekIntention weekStart={currentWeekStart} />
    </>
  );
}
