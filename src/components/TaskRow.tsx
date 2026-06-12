import { useState, useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useStore } from '../store'
import type { Task } from '../types'

const COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6']

type Props = {
  task: Task
}

export default function TaskRow({ task }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const toggleDone = useStore(s => s.toggleDone)
  const updateTask = useStore(s => s.updateTask)
  const deleteTask = useStore(s => s.deleteTask)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const handleSave = () => {
    const trimmed = editTitle.trim()
    if (trimmed) {
      updateTask(task.id, { title: trimmed })
    } else {
      deleteTask(task.id)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setEditTitle(task.title)
      setIsEditing(false)
    }
  }

  const cycleColor = () => {
    const current = task.color ?? -1
    const next = (current + 1) % (COLORS.length + 1)
    updateTask(task.id, { color: next > COLORS.length - 1 ? null : next })
  }

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { date: task.date, order: task.order },
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="flex items-center gap-2 py-1 group">
      <button
        onClick={cycleColor}
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{
          backgroundColor: task.color !== null ? COLORS[task.color] : 'transparent',
          border: task.color !== null ? 'none' : '1px solid #ccc',
        }}
      />
      {isEditing ? (
        <input
          ref={inputRef}
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-b border-black/20 outline-none"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 cursor-text ${task.done ? 'line-through text-gray-400' : ''}`}
        >
          {task.title}
        </span>
      )}
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => toggleDone(task.id)}
        className="flex-shrink-0 cursor-pointer"
      />
      <button
        onClick={() => deleteTask(task.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
}
