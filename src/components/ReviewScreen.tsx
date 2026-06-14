import { useState } from 'react'
import { useStore } from '../store'
import { formatDate, getWeekDays, getWeekStart, getWeekId } from '../dates'
import { endOfISOWeek } from 'date-fns'
import RingChart from './RingChart'
import type { WeekReview } from '../types'

type Props = {
  onClose: () => void
}

export default function ReviewScreen({ onClose }: Props) {
  const tasks = useStore(s => s.tasks)
  const events = useStore(s => s.events)
  const reviews = useStore(s => s.reviews)
  const saveReview = useStore(s => s.saveReview)
  const deleteTask = useStore(s => s.deleteTask)
  const moveTask = useStore(s => s.moveTask)

  const weekStart = getWeekStart(new Date())
  const weekEnd = endOfISOWeek(weekStart)
  const weekDays = getWeekDays(weekStart)
  const weekId = getWeekId(weekStart)

  const weekTasks = tasks.filter(t =>
    t.date !== null && weekDays.some(d => formatDate(d) === t.date)
  )

  const weekEvents = events.filter(e => {
    const eventDate = e.createdAt.slice(0, 10)
    return eventDate >= formatDate(weekStart) && eventDate <= formatDate(weekEnd)
  })

  const completedTaskIds = [...new Set(
    weekEvents
      .filter(e => e.type === 'completed')
      .map(e => e.taskId)
  )]

  const rolledOverTaskIds = [...new Set(
    weekEvents
      .filter(e => e.type === 'rolled-over')
      .map(e => e.taskId)
  )]

  const completed = tasks.filter(t => completedTaskIds.includes(t.id))
  const rolledOver = tasks.filter(t => rolledOverTaskIds.includes(t.id))

  const [reflection, setReflection] = useState('')

  const streak = reviews.length > 0 ? reviews[reviews.length - 1].streak + 1 : 1

  const handleSave = () => {
    const now = new Date().toISOString()
    const review: WeekReview = {
      weekId,
      completedCount: completed.length,
      plannedCount: weekTasks.length,
      rolledOverCount: rolledOver.length,
      reflection,
      viewedAt: now,
      streak,
      completedTaskIds,
      rolledOverTaskIds,
      createdAt: now,
      updatedAt: now,
    }
    saveReview(review)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-[#f5f0e8] z-50 overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-mono font-bold">Weekly Review</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
        </div>

        {/* Streak */}
        <div className="text-sm text-gray-500 mb-4">
          🔥 {streak}-week review streak
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mb-8">
          <RingChart completed={completed.length} total={weekTasks.length} />
          <div>
            <div className="text-2xl font-mono font-bold">
              {completed.length} of {weekTasks.length}
            </div>
            <div className="text-sm text-gray-500">tasks completed</div>
          </div>
        </div>

        {/* Done list */}
        <div className="mb-8">
          <h3 className="text-sm font-mono text-gray-500 mb-2">Completed</h3>
          {completed.map(task => (
            <div key={task.id} className="text-sm line-through text-gray-400 py-0.5">
              {task.title}
            </div>
          ))}
        </div>

        {/* Rolled over */}
        {rolledOver.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-mono text-gray-500 mb-2">Slipped</h3>
            {rolledOver.map(task => (
              <div key={task.id} className="flex items-center gap-2 py-1">
                <span className="text-sm flex-1">{task.title}</span>
                <span className="text-xs bg-black/10 px-2 py-0.5 rounded font-mono">
                  moved {task.rolledOverCount}×
                </span>
                <button
                  onClick={() => moveTask(task.id, formatDate(weekDays[0]), task.order)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  → Next week
                </button>
                <button
                  onClick={() => moveTask(task.id, null, task.order)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  → Backlog
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reflection */}
        <div className="mb-8">
          <h3 className="text-sm font-mono text-gray-500 mb-2">Reflection</h3>
          <input
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            placeholder="How was your week?"
            className="w-full bg-transparent border-b border-black/20 outline-none py-2"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-black text-white rounded hover:bg-black/80"
        >
          Done
        </button>
      </div>
    </div>
  )
}
