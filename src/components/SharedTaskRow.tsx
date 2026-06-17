import type { SharedWeekTask } from '../types'

const COLOR_MAP: Record<string, string> = {
  red: '#e74c3c',
  orange: '#e67e22',
  yellow: '#eab308',
  green: '#22c55e',
}

type Props = {
  task: SharedWeekTask;
}

export default function SharedTaskRow({ task }: Props) {
  const statusLabel = task.done ? 'Completed' : 'Incomplete'
  const hasColor = task.color !== null && task.color in COLOR_MAP
  const colorBg = hasColor
    ? { backgroundColor: `${COLOR_MAP[task.color!]}18` }
    : undefined

  return (
    <div className="relative flex h-10 items-center gap-2 rounded-full px-2 text-sm leading-snug">
      {hasColor && (
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={colorBg}
        />
      )}
      <span
        className={`relative z-[1] grid h-4 w-4 flex-shrink-0 place-items-center rounded-[5px] ${
          task.done ? 'bg-ink' : 'bg-ink/[0.04]'
        }`}
        aria-hidden
      >
        {task.done && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--bg)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        )}
      </span>
      <span
        className={`relative z-[1] min-w-0 flex-1 truncate ${
          task.done ? 'text-faint line-through' : 'text-ink'
        }`}
      >
        {task.title}
        <span className="sr-only">. {statusLabel}.</span>
      </span>
    </div>
  )
}
