import { useDroppable } from '@dnd-kit/core'
import { useStore } from '../store'
import { useShallow } from 'zustand/shallow'
import { formatDate, isToday } from '../dates'
import TaskRow from './TaskRow'
import NewTaskLine from './NewTaskLine'

type Props = {
  date: Date
}

export default function DayColumn({ date }: Props) {
  const tasks = useStore(
    useShallow(s =>
      s.tasks
        .filter(t => t.date === formatDate(date))
        .sort((a, b) => a.order - b.order)
    )
  )

  const { setNodeRef } = useDroppable({
    id: `day-${formatDate(date)}`,
    data: { date: formatDate(date) },
  })

  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const monthName = date.toLocaleDateString('en-US', { month: 'long' })
  const dayNum = date.getDate()
  const today = isToday(date)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-h-0 ${today ? 'bg-black/[.03]' : ''}`}
    >
      <div className="sticky top-0 z-10 px-2 py-2 flex items-baseline justify-between md:static" style={{ backgroundColor: 'var(--bg)' }}>
        <div className={`text-base font-mono font-semibold ${today ? 'font-bold' : ''}`}>
          {dayNum} <span className="font-normal">{monthName}</span>
        </div>
        <div className="text-base text-gray-500 font-mono">{dayName}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
        {Array.from({ length: Math.max(0, 3 - tasks.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="flex items-center gap-2 py-1.5 border-b border-black/5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" />
            <div className="flex-1 h-4" />
          </div>
        ))}
        <NewTaskLine date={formatDate(date)} />
      </div>
    </div>
  )
}
