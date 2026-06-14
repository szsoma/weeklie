import { useDroppable } from '@dnd-kit/core'
import { useStore } from '../store'
import { useShallow } from 'zustand/shallow'
import { formatDate, isToday } from '../dates'
import TaskRow from './TaskRow'
import NewTaskLine from './NewTaskLine'

type Props = {
  date: Date
  halfHeight?: boolean
}

const SLOT_COUNT = 8
const HALF_SLOT_COUNT = 4

export default function DayColumn({ date, halfHeight = false }: Props) {
  const tasks = useStore(useShallow(s =>
    s.tasks
      .filter(t => t.date === formatDate(date))
      .sort((a, b) => a.order - b.order)
  ))

  const { setNodeRef } = useDroppable({
    id: `day-${formatDate(date)}`,
    data: { date: formatDate(date) },
  })

  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dayNum = date.getDate()
  const monthName = date.toLocaleDateString('en-US', { month: 'short' })
  const today = isToday(date)

  const slotCount = halfHeight ? HALF_SLOT_COUNT : SLOT_COUNT
  const emptySlots = Math.max(0, slotCount - tasks.length)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-h-0 border-r border-black/10 ${today ? 'bg-black/[.03]' : ''}`}
    >
      <div className="sticky top-0 z-10 px-3 py-2 flex items-baseline justify-between md:static" style={{ backgroundColor: 'var(--bg)' }}>
        <div className={`text-[22px] font-mono ${today ? 'font-bold' : ''}`}>
          {dayNum} <span className="text-gray-500 text-base">{monthName}</span>
        </div>
        <div className="text-sm text-gray-500 font-mono">{dayName}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="text-sm text-gray-300 italic py-2">No tasks</div>
        )}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={i} className="h-10 border-b border-black/5" />
        ))}
        <NewTaskLine date={formatDate(date)} />
      </div>
    </div>
  )
}
