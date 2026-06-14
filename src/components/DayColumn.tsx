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
  const monthName = date.toLocaleDateString('en-US', { month: 'short' })
  const dayNum = date.getDate()
  const today = isToday(date)

  return (
    <div
      ref={setNodeRef}
      className={`relative flex flex-col min-h-0 h-full ${today ? 'bg-today' : ''}`}
    >
      {/* Today accent — a hairline ink cap across the column top */}
      {today && <div className="absolute inset-x-0 top-0 h-[2px] bg-ink z-20" />}

      <div
        className="sticky top-0 z-10 md:static px-3 md:px-4 pt-3.5 pb-3 flex items-baseline justify-between gap-2 border-b border-rule"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-mono font-semibold text-[17px] leading-none tabular-nums text-ink">
            {String(dayNum).padStart(2, '0')}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted leading-none">
            {monthName}
          </span>
        </div>
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.2em] leading-none ${
            today ? 'text-ink font-semibold' : 'text-faint'
          }`}
        >
          {dayName}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-3">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}

        {/* Empty ruled slots — fill the column like notebook lines */}
        {Array.from({ length: Math.max(0, 3 - tasks.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-2.5 py-2 border-b border-rule"
          >
            <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-dashed border-rule-strong/60" />
            <div className="flex-1" />
          </div>
        ))}

        <NewTaskLine date={formatDate(date)} />
      </div>
    </div>
  )
}
