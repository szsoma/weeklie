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
  const tasks = useStore(useShallow(s =>
    s.tasks
      .filter(t => t.date === null)
      .sort((a, b) => a.order - b.order)
  ))

  return (
    <div ref={setNodeRef} className="border-t border-black/10 flex flex-col min-h-[35vh]">
      <div className="px-6 py-3">
        <h2 className="text-base font-mono text-gray-500">Backlog</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-3">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
        <NewTaskLine date={null} />
      </div>
    </div>
  )
}
