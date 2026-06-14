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

  const weekdays = days.slice(0, 5) // Mon-Fri
  const saturday = days[5]
  const sunday = days[6]

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="grid grid-cols-2 md:grid-cols-5 flex-1 min-h-0">
        {weekdays.map(day => (
          <div key={day.toISOString()} ref={isToday(day) ? todayRef : undefined}>
            <DayColumn date={day} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 min-h-0 h-1/2">
        <div ref={isToday(saturday) ? todayRef : undefined}>
          <DayColumn date={saturday} halfHeight />
        </div>
        <div ref={isToday(sunday) ? todayRef : undefined}>
          <DayColumn date={sunday} halfHeight />
        </div>
      </div>
    </div>
  )
}
