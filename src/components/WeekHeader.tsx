import { useStore } from '../store'
import { formatWeekLabel, getWeekStart, nextWeek, prevWeek } from '../dates'

export default function WeekHeader() {
  const currentWeekStart = useStore(s => s.currentWeekStart)
  const setCurrentWeekStart = useStore(s => s.setCurrentWeekStart)

  const goToToday = () => setCurrentWeekStart(getWeekStart(new Date()))

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentWeekStart(prevWeek(currentWeekStart))}
          className="p-2 hover:bg-black/5 rounded"
        >
          ←
        </button>
        <h1 className="text-lg font-mono font-semibold">
          {formatWeekLabel(currentWeekStart)}
        </h1>
        <button
          onClick={() => setCurrentWeekStart(nextWeek(currentWeekStart))}
          className="p-2 hover:bg-black/5 rounded"
        >
          →
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={goToToday}
          className="px-3 py-1 text-sm border border-black/10 rounded hover:bg-black/5"
        >
          Today
        </button>
        <button
          className="px-3 py-1 text-sm border border-black/10 rounded hover:bg-black/5"
        >
          Review
        </button>
      </div>
    </header>
  )
}
