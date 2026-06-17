import { getWeekDays, isToday, toLocalDateKey } from '../dates'
import type { SharedWeekTask } from '../types'
import SharedTaskRow from './SharedTaskRow'

type Props = {
  weekStart: Date;
  tasks: SharedWeekTask[];
}

type SharedDayColumnProps = {
  date: Date;
  tasks: SharedWeekTask[];
}

function SharedDayColumn({ date, tasks }: SharedDayColumnProps) {
  const dateKey = toLocalDateKey(date)
  const dayTasks = tasks
    .filter((task) => task.date === dateKey)
    .sort((a, b) => a.order - b.order)
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const monthName = date.toLocaleDateString('en-US', { month: 'short' })
  const dayNum = date.getDate()
  const today = isToday(date)

  return (
    <div
      className={`relative flex min-h-[220px] flex-col md:h-full md:min-h-0 ${
        today ? 'bg-today' : 'bg-bg'
      }`}
    >
      <div
        className="sticky top-0 z-10 flex min-h-[44px] items-center justify-between gap-2 border-b border-rule px-2 md:static"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="font-mono text-[18px] font-semibold leading-none tabular-nums text-ink">
            {String(dayNum).padStart(2, '0')}
          </span>
          <span className="font-mono text-[18px] font-semibold uppercase leading-none text-ink">
            {monthName}
          </span>
        </div>
        <span className="font-mono text-[18px] leading-none text-muted">
          {dayName}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-5 pt-1 md:pb-24">
        {dayTasks.length === 0 ? (
          <p className="px-2 py-3 font-mono text-xs uppercase tracking-[0.08em] text-faint">
            Open
          </p>
        ) : (
          dayTasks.map((task) => (
            <SharedTaskRow key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  )
}

export default function SharedWeekGrid({ weekStart, tasks }: Props) {
  const days = getWeekDays(weekStart)
  const weekdays = days.slice(0, 5)
  const saturday = days[5]
  const sunday = days[6]

  return (
    <>
      <div className="weekgrid flex-1 min-h-0 divide-y divide-rule overflow-y-auto pb-10 md:hidden">
        {days.map((day) => (
          <SharedDayColumn
            key={day.toISOString()}
            date={day}
            tasks={tasks}
          />
        ))}
      </div>

      <div className="mx-6 hidden min-h-0 flex-1 grid-cols-6 grid-rows-2 gap-px bg-rule md:grid">
        {weekdays.map((day) => (
          <div key={day.toISOString()} className="min-w-0">
            <SharedDayColumn date={day} tasks={tasks} />
          </div>
        ))}
        <div key={saturday.toISOString()} className="min-w-0">
          <SharedDayColumn date={saturday} tasks={tasks} />
        </div>
        <div className="col-start-1 col-end-6 row-start-2 grid place-items-center bg-bg p-6 text-center">
          <p className="max-w-md font-mono text-sm uppercase tracking-[0.08em] text-muted">
            Backlog is private and not included in shared week links.
          </p>
        </div>
        <div key={sunday.toISOString()} className="col-start-6 row-start-2 min-w-0">
          <SharedDayColumn date={sunday} tasks={tasks} />
        </div>
      </div>
    </>
  )
}
