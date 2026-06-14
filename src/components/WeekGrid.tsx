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

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 flex-1 min-h-0">
      {days.map(day => (
        <div key={day.toISOString()} ref={isToday(day) ? todayRef : undefined}>
          <DayColumn date={day} />
        </div>
      ))}
    </div>
  )
}
