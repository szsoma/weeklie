import { useDroppable } from '@dnd-kit/core'
import { useStore } from '../store'
import { useShallow } from 'zustand/shallow'
import TaskRow from './TaskRow'
import NewTaskLine from './NewTaskLine'

export default function BacklogPanel() {
  const { setNodeRef } = useDroppable({
    id: 'backlog',
    data: { date: null },
  })
  const tasks = useStore(
    useShallow(s =>
      s.tasks
        .filter(t => t.date === null)
        .sort((a, b) => a.order - b.order)
    )
  )

  return (
    <div ref={setNodeRef} className="border-t border-rule-strong flex flex-col min-h-[34vh]">
      <div className="flex items-baseline gap-2 px-5 md:px-8 py-3 border-b border-rule">
        <h2 className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted">
          Backlog
        </h2>
        <span className="font-mono text-[11px] text-faint tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 md:px-8 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
        <NewTaskLine date={null} />
      </div>
    </div>
  )
}
