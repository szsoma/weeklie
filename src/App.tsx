import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import WeekHeader from './components/WeekHeader'
import WeekGrid from './components/WeekGrid'
import BacklogPanel from './components/BacklogPanel'
import { useStore } from './store'

export default function App() {
  const moveTask = useStore(s => s.moveTask)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const targetDate = over.data.current?.date as string | null
    const targetOrder = over.data.current?.order as number

    if (targetDate !== undefined) {
      moveTask(taskId, targetDate, targetOrder)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col">
        <WeekHeader />
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <WeekGrid />
          </div>
          <BacklogPanel />
        </div>
      </div>
    </DndContext>
  )
}
