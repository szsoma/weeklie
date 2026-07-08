import { useState } from "react";
import { useStore } from "../store";
import {
  formatDate,
  formatWeekLabel,
  getWeekDays,
  nextWeek,
  prevWeek,
} from "../dates";

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

function ShareIcon() {
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
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 16V4" />
      <path d="M8 8l4-4 4 4" />
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

const NAV_BUTTON_CLASS =
  "grid place-items-center w-10 h-8 rounded-lg text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const DESKTOP_ACTION_BASE_CLASS =
  "h-8 w-auto font-mono text-[12px] uppercase rounded-md border active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const DESKTOP_ACTION_BUTTON_CLASS = `${DESKTOP_ACTION_BASE_CLASS} border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06]`;
const MOBILE_MENU_ITEM_CLASS =
  "flex items-center gap-3 w-full px-4 py-3 font-mono text-[12px] text-ink hover:bg-ink/[0.06] transition";
const DISABLED_ACTION_CLASS = "disabled:opacity-40 disabled:cursor-not-allowed";

function getShowDoneLabel(doneCount: number): string {
  if (doneCount === 0) return "Show done tasks";
  return `Show ${doneCount} done task${doneCount === 1 ? "" : "s"}`;
}

function getHideDoneAriaLabel(hideDone: boolean, doneCount: number): string {
  return hideDone ? getShowDoneLabel(doneCount) : "Hide done tasks";
}

function getHideDoneButtonClassName(hideDone: boolean): string {
  const stateClass = hideDone
    ? "bg-ink text-bg border-ink"
    : "border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06]";
  return `relative ${DESKTOP_ACTION_BASE_CLASS} ${stateClass}`;
}

function getHideDoneText(
  hideDone: boolean,
  doneCount: number,
  countStyle: "plain" | "parenthesized",
): string {
  if (!hideDone) return "Hide done";
  if (doneCount === 0) return "Show done";
  return countStyle === "parenthesized"
    ? `Show done (${doneCount})`
    : `Show done ${doneCount}`;
}

function getCopyLastWeekTitle(previousUndoneCount: number): string {
  return previousUndoneCount === 0
    ? "No tasks to copy"
    : "Copy undone tasks from last week";
}

type Props = {
  onShowReview?: () => void;
  onShowShare?: () => void;
};

export default function WeekHeader({ onShowReview, onShowShare }: Props) {
  const currentWeekStart = useStore((s) => s.currentWeekStart);
  const setCurrentWeekStart = useStore((s) => s.setCurrentWeekStart);
  const hideDone = useStore((s) => s.hideDone);
  const setHideDone = useStore((s) => s.setHideDone);
  const todayFocusActive = useStore((s) => s.todayFocusActive);
  const toggleTodayFocus = useStore((s) => s.toggleTodayFocus);
  const doneCount = useStore((s) => s.tasks.filter((t) => t.done).length);
  const tasks = useStore((s) => s.tasks);
  const copyLastWeekTasks = useStore((s) => s.copyLastWeekTasks);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCopyingLastWeek, setIsCopyingLastWeek] = useState(false);

  const previousWeekStart = prevWeek(currentWeekStart);
  const today = formatDate(new Date());
  const visibleWeekIncludesToday = getWeekDays(currentWeekStart)
    .map(formatDate)
    .includes(today);
  const previousWeekDates = new Set(
    getWeekDays(previousWeekStart).map(formatDate),
  );
  const previousUndoneCount = tasks.filter(
    (task) =>
      task.date !== null && previousWeekDates.has(task.date) && !task.done,
  ).length;
  const copyLastWeekDisabled = isCopyingLastWeek || previousUndoneCount === 0;
  const copyLastWeekLabel = isCopyingLastWeek ? "Copying" : "Copy last week";
  const hideDoneDesktopLabel = getHideDoneText(hideDone, doneCount, "plain");
  const hideDoneMobileLabel = getHideDoneText(
    hideDone,
    doneCount,
    "parenthesized",
  );

  const handleCopyLastWeek = async () => {
    if (copyLastWeekDisabled) return;
    setIsCopyingLastWeek(true);
    await copyLastWeekTasks();
    setIsCopyingLastWeek(false);
  };

  return (
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
            className={NAV_BUTTON_CLASS}
          >
            <Chevron direction="left" />
          </button>

          <button
            onClick={() => setCurrentWeekStart(nextWeek(currentWeekStart))}
            aria-label="Next week"
            className={NAV_BUTTON_CLASS}
          >
            <Chevron direction="right" />
          </button>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggleTodayFocus}
              disabled={!visibleWeekIncludesToday}
              aria-pressed={todayFocusActive}
              aria-label="Toggle today focus"
              className={`relative h-8 font-mono text-[14px] uppercase rounded-md border transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
                todayFocusActive
                  ? "bg-ink text-bg border-ink"
                  : "border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06]"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
            >
              <span className="hidden md:inline px-4">Today</span>
            </button>

            <button
              onClick={() => setHideDone(!hideDone)}
              aria-pressed={hideDone}
              aria-label={getHideDoneAriaLabel(hideDone, doneCount)}
              className={getHideDoneButtonClassName(hideDone)}
            >
              <span className="hidden md:inline px-4">
                {hideDoneDesktopLabel}
              </span>
            </button>

            <button
              onClick={handleCopyLastWeek}
              disabled={copyLastWeekDisabled}
              title={getCopyLastWeekTitle(previousUndoneCount)}
              className={`${DESKTOP_ACTION_BUTTON_CLASS} ${DISABLED_ACTION_CLASS}`}
            >
              <span className="hidden md:inline px-4">{copyLastWeekLabel}</span>
            </button>

            {onShowShare && (
              <button
                onClick={onShowShare}
                aria-label="Share this week"
                className="h-8 w-auto font-mono text-[14px] uppercase rounded-md border border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <span className="hidden md:inline px-4">Share</span>
              </button>
            )}

            <button
              onClick={onShowReview}
              aria-label="Open weekly review"
              className={DESKTOP_ACTION_BUTTON_CLASS}
            >
              <span className="hidden md:inline px-4">Review</span>
            </button>
          </div>

          <div className="relative md:hidden">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="More actions"
              className={NAV_BUTTON_CLASS}
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
                    toggleTodayFocus();
                    setMenuOpen(false);
                  }}
                  disabled={!visibleWeekIncludesToday}
                  aria-pressed={todayFocusActive}
                  className="flex items-center gap-3 w-full px-4 py-3 font-mono text-[14px] text-ink hover:bg-ink/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <CalendarIcon />
                  <span>Today</span>
                </button>

                <button
                  onClick={() => {
                    setHideDone(!hideDone);
                    setMenuOpen(false);
                  }}
                  className={MOBILE_MENU_ITEM_CLASS}
                >
                  <EyeIcon hidden={hideDone} />
                  <span>{hideDoneMobileLabel}</span>
                </button>

                <button
                  onClick={async () => {
                    await handleCopyLastWeek();
                    setMenuOpen(false);
                  }}
                  disabled={copyLastWeekDisabled}
                  className={`${MOBILE_MENU_ITEM_CLASS} ${DISABLED_ACTION_CLASS}`}
                >
                  <CalendarIcon />
                  <span>{copyLastWeekLabel}</span>
                </button>

                {onShowShare && (
                  <button
                    onClick={() => {
                      onShowShare();
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 font-mono text-[14px] text-ink hover:bg-ink/[0.06] transition"
                  >
                    <ShareIcon />
                    <span>Share</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onShowReview?.();
                    setMenuOpen(false);
                  }}
                  className={MOBILE_MENU_ITEM_CLASS}
                >
                  <ReviewIcon />
                  <span>Review</span>
                </button>
              </div>
            )}
          </div>
        </div>
    </header>
  );
}
