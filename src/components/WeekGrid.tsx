import { useStore } from '../store'
import { getWeekDays } from '../dates'
import DayColumn from './DayColumn'

export default function WeekGrid() {
  const currentWeekStart = useStore(s => s.currentWeekStart)
  const days = getWeekDays(currentWeekStart)

  return (
    <div className="grid grid-cols-7 flex-1 min-h-0">
      {days.map(day => (
        <DayColumn key={day.toISOString()} date={day} />
      ))}
    </div>
  )
}
