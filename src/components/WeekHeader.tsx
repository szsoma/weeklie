import { useStore } from '../store'
import { formatWeekLabel, getWeekStart, nextWeek, prevWeek } from '../dates'

export default function WeekHeader() {
  const currentWeekStart = useStore(s => s.currentWeekStart)
  const setCurrentWeekStart = useStore(s => s.setCurrentWeekStart)

  const goToToday = () => setCurrentWeekStart(getWeekStart(new Date()))

  return (
    <header className="flex items-center justify-between px-8 py-5">
      <div className="flex items-center gap-5">
        <button
          onClick={() => setCurrentWeekStart(prevWeek(currentWeekStart))}
          className="p-3 hover:bg-black/5 rounded text-lg"
        >
          ←
        </button>
        <h1 className="text-xl font-mono font-semibold">
          {formatWeekLabel(currentWeekStart)}
        </h1>
        <button
          onClick={() => setCurrentWeekStart(nextWeek(currentWeekStart))}
          className="p-3 hover:bg-black/5 rounded text-lg"
        >
          →
        </button>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={goToToday}
          className="px-4 py-2 text-base border border-black/10 rounded hover:bg-black/5"
        >
          Today
        </button>
        <button
          className="px-4 py-2 text-base border border-black/10 rounded hover:bg-black/5"
        >
          Review
        </button>
      </div>
    </header>
  )
}
