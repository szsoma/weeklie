import { useStore } from '../store'
import { formatWeekLabel, getWeekStart, nextWeek, prevWeek } from '../dates'

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-4 h-4 ${direction === 'left' ? '' : 'rotate-180'}`}
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

  const goToToday = () => setCurrentWeekStart(getWeekStart(new Date()))

  return (
    <header className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-rule">
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={() => setCurrentWeekStart(prevWeek(currentWeekStart))}
          aria-label="Previous week"
          className="grid place-items-center w-8 h-8 -ml-1.5 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition"
        >
          <Chevron direction="left" />
        </button>

        <div className="flex flex-col min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint leading-none mb-1">
            Week
          </span>
          <h1 className="font-mono font-semibold text-xl md:text-[22px] tracking-tight leading-none whitespace-nowrap">
            {formatWeekLabel(currentWeekStart)}
          </h1>
        </div>

        <button
          onClick={() => setCurrentWeekStart(nextWeek(currentWeekStart))}
          aria-label="Next week"
          className="grid place-items-center w-8 h-8 -mr-1.5 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition"
        >
          <Chevron direction="right" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={goToToday}
          className="h-8 px-3.5 font-mono text-[12px] uppercase tracking-[0.12em] rounded-md border border-rule-strong text-ink hover:bg-ink/[0.06] active:scale-[0.98] transition"
        >
          Today
        </button>
        <button
          className="h-8 px-3.5 font-mono text-[12px] uppercase tracking-[0.12em] rounded-md border border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-[0.98] transition"
        >
          Review
        </button>
      </div>
    </header>
  )
}
