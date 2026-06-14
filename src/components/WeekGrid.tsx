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
  const weekend = days.slice(5, 7)   // Sat-Sun

  return (
    <>
      <div className="grid grid-cols-1 md:hidden flex-1 min-h-0 overflow-y-auto">
        {days.map(day => (
          <div key={day.toISOString()} ref={isToday(day) ? todayRef : undefined}>
            <DayColumn date={day} />
          </div>
        ))}
      </div>
      <div className="hidden md:flex flex-1 min-h-0">
        {weekdays.map(day => (
          <div key={day.toISOString()} ref={isToday(day) ? todayRef : undefined} className="flex-1 min-w-0">
            <DayColumn date={day} />
          </div>
        ))}
        <div className="flex-1 min-w-0 flex flex-col">
          {weekend.map(day => (
            <div key={day.toISOString()} ref={isToday(day) ? todayRef : undefined} className="flex-1 min-h-0">
              <DayColumn date={day} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
