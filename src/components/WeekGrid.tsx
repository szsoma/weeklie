import { useRef, useEffect } from 'react'
import { useStore } from '../store'
import { getWeekDays, isToday } from '../dates'
import DayColumn from './DayColumn'

export default function WeekGrid() {
  const currentWeekStart = useStore(s => s.currentWeekStart)
  const days = getWeekDays(currentWeekStart)
  const todayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.innerWidth < 768 && todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const weekdays = days.slice(0, 6) // Mon-Sat
  const sunday = days[6] // Sunday

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="grid grid-cols-2 md:grid-cols-6 flex-1 min-h-0">
        {weekdays.map(day => (
          <div key={day.toISOString()} ref={isToday(day) ? todayRef : undefined}>
            <DayColumn date={day} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 min-h-0">
        <div className="md:col-start-6" ref={isToday(sunday) ? todayRef : undefined}>
          <DayColumn date={sunday} />
        </div>
      </div>
    </div>
  )
}
