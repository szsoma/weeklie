import { useState, useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useStore } from '../store'
import type { Task } from '../types'

const COLOR_TOKENS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const
const COLOR_MAP: Record<string, string> = {
  red: '#e74c3c',
  orange: '#e67e22',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
}

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
    if (task.color === null) {
      updateTask(task.id, { color: COLOR_TOKENS[0] })
    } else {
      const currentIndex = COLOR_TOKENS.indexOf(task.color as typeof COLOR_TOKENS[number])
      const nextIndex = currentIndex + 1
      updateTask(task.id, { color: nextIndex >= COLOR_TOKENS.length ? null : COLOR_TOKENS[nextIndex] })
    }
  }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { date: task.date, order: task.order },
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group relative flex items-center gap-2.5 py-2 pr-1 text-[15px] leading-snug cursor-grab ${
        isEditing ? '' : 'border-b border-rule'
      } ${isDragging ? 'opacity-40 cursor-grabbing' : 'hover:bg-ink/[0.025]'}`}
    >
      <button
        onClick={cycleColor}
        aria-label="Cycle task color"
        className="w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform hover:scale-110"
        style={{
          backgroundColor: task.color !== null ? COLOR_MAP[task.color] : 'transparent',
          border: task.color !== null ? 'none' : '1px solid var(--rule-strong)',
        }}
      />

      {isEditing ? (
        <input
          ref={inputRef}
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-b border-ink/30 outline-none text-[15px] leading-snug py-0.5"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 cursor-text ${task.done ? 'line-through text-faint' : 'text-ink'}`}
        >
          {task.title}
        </span>
      )}

      {/* Custom checkbox — cream check on ink fill */}
      <label className="relative flex-shrink-0 inline-flex w-[18px] h-[18px] cursor-pointer">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => toggleDone(task.id)}
          onPointerDown={(e) => e.stopPropagation()}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-[5px] border border-rule-strong bg-bg transition-colors peer-checked:border-ink peer-checked:bg-ink" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--bg)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none relative z-10 m-auto w-[11px] h-[11px] opacity-0 peer-checked:opacity-100 transition-opacity"
        >
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      </label>

      <button
        onClick={(e) => {
          e.stopPropagation()
          deleteTask(task.id)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Delete task"
        className="flex-shrink-0 w-4 text-faint hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition leading-none text-lg"
      >
        ×
      </button>
    </div>
  )
}
