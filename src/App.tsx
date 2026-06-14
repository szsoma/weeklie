import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDndContext } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import SiteHeader from './components/SiteHeader'
import WeekHeader from './components/WeekHeader'
import WeekGrid from './components/WeekGrid'
import ReviewScreen from './components/ReviewScreen'
import { useStore } from './store'
import { useRollover } from './hooks/useRollover'
import Toast from './components/Toast'

function TaskDragOverlay() {
  const { active } = useDndContext()
  const activeTask = useStore(s =>
    active?.id ? s.tasks.find(t => t.id === active.id) ?? null : null
  )

  if (!activeTask) return null

  return (
    <DragOverlay dropAnimation={null}>
      <div className="opacity-90 bg-surface border border-rule-strong rounded-md px-4 py-3 shadow-lg text-[19px] cursor-grabbing">
        {activeTask.title}
      </div>
    </DragOverlay>
  )
}

export default function App() {
  const { toast: rolloverToast, clearToast } = useRollover()
  const moveTask = useStore(s => s.moveTask)

  const [showReview, setShowReview] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const targetDate = over.data.current?.date as string | null
    let targetOrder = over.data.current?.order as number | undefined

    if (targetDate === undefined) return

    if (targetOrder === undefined) {
      const tasks = useStore.getState().tasks.filter(t => t.date === targetDate && t.id !== taskId)
      targetOrder = tasks.length > 0
        ? Math.max(...tasks.map(t => t.order)) + 1
        : 1
    }

    moveTask(taskId, targetDate, targetOrder)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col">
        <SiteHeader />
        <WeekHeader onShowReview={() => setShowReview(true)} />
        <WeekGrid />
      </div>
      {showReview && <ReviewScreen onClose={() => setShowReview(false)} />}
      {rolloverToast && (
        <Toast
          message={rolloverToast.message}
          onDismiss={clearToast}
        />
      )}
      <TaskDragOverlay />
    </DndContext>
  )
}
