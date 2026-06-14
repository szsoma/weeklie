import { useStore } from '../store'
import { formatWeekLabel, getWeekStart, nextWeek, prevWeek } from '../dates'

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-[18px] h-[18px] ${direction === 'left' ? '' : 'rotate-180'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

export default function WeekHeader() {
  const currentWeekStart = useStore(s => s.currentWeekStart)
  const setCurrentWeekStart = useStore(s => s.setCurrentWeekStart)
  const hideDone = useStore(s => s.hideDone)
  const setHideDone = useStore(s => s.setHideDone)
  const doneCount = useStore(s => s.tasks.filter(t => t.done).length)

  const goToToday = () => setCurrentWeekStart(getWeekStart(new Date()))

  return (
    <header className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-rule">
      <div className="flex items-center gap-3 md:gap-5">
        <button
          onClick={() => setCurrentWeekStart(prevWeek(currentWeekStart))}
          aria-label="Previous week"
          className="grid place-items-center w-9 h-9 -ml-2 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition"
        >
          <Chevron direction="left" />
        </button>

        <div className="flex flex-col min-w-0">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint leading-none mb-1.5">
            Week
          </span>
          <h1 className="font-mono font-semibold text-2xl md:text-[26px] tracking-tight leading-none whitespace-nowrap">
            {formatWeekLabel(currentWeekStart)}
          </h1>
        </div>

        <button
          onClick={() => setCurrentWeekStart(nextWeek(currentWeekStart))}
          aria-label="Next week"
          className="grid place-items-center w-9 h-9 -mr-2 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition"
        >
          <Chevron direction="right" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setHideDone(!hideDone)}
          aria-pressed={hideDone}
          className={`h-9 px-3.5 font-mono text-[13px] uppercase tracking-[0.1em] rounded-md border transition active:scale-[0.98] ${
            hideDone
              ? 'bg-ink text-bg border-ink'
              : 'border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06]'
          }`}
        >
          {hideDone ? `Show done${doneCount ? ` ${doneCount}` : ''}` : 'Hide done'}
        </button>
        <button
          onClick={goToToday}
          className="h-9 px-3.5 font-mono text-[13px] uppercase tracking-[0.1em] rounded-md border border-rule-strong text-ink hover:bg-ink/[0.06] active:scale-[0.98] transition"
        >
          Today
        </button>
        <button className="h-9 px-3.5 font-mono text-[13px] uppercase tracking-[0.1em] rounded-md border border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-[0.98] transition">
          Review
        </button>
      </div>
    </header>
  )
}
