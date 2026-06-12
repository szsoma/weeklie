import { useDroppable } from '@dnd-kit/core'
import { useStore } from '../store'
import { formatDate, isToday } from '../dates'
import TaskRow from './TaskRow'
import NewTaskLine from './NewTaskLine'

type Props = {
  date: Date
}

export default function DayColumn({ date }: Props) {
  const tasks = useStore(s =>
    s.tasks
      .filter(t => t.date === formatDate(date))
      .sort((a, b) => a.order - b.order)
  )

  const { setNodeRef } = useDroppable({
    id: `day-${formatDate(date)}`,
    data: { date: formatDate(date) },
  })

  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dayNum = date.getDate()
  const today = isToday(date)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-h-0 ${today ? 'bg-black/[.03]' : ''}`}
    >
      <div className="px-2 py-2 text-center">
        <div className="text-xs text-gray-500 font-mono">{dayName}</div>
        <div className={`text-sm font-mono ${today ? 'font-bold' : ''}`}>
          {dayNum}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
        <NewTaskLine date={formatDate(date)} />
      </div>
    </div>
  )
}
