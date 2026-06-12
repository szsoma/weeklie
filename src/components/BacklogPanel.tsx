import { useDroppable } from '@dnd-kit/core'
import { useStore } from '../store'
import TaskRow from './TaskRow'
import NewTaskLine from './NewTaskLine'

export default function BacklogPanel() {
  const { setNodeRef } = useDroppable({
    id: 'backlog',
    data: { date: null },
  })
  const tasks = useStore(s =>
    s.tasks
      .filter(t => t.date === null)
      .sort((a, b) => a.order - b.order)
  )

  return (
    <div ref={setNodeRef} className="border-t border-black/10 flex flex-col min-h-[35vh]">
      <div className="px-4 py-2">
        <h2 className="text-sm font-mono text-gray-500">Backlog</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
        <NewTaskLine date={null} />
      </div>
    </div>
  )
}
