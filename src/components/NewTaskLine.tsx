import { useState, useRef } from 'react'
import { useStore } from '../store'

type Props = {
  date: string | null // null = Backlog
}

export default function NewTaskLine({ date }: Props) {
  const [title, setTitle] = useState('')
  const [_isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const addTask = useStore(s => s.addTask)

  const handleSave = () => {
    const trimmed = title.trim()
    if (trimmed) {
      addTask(trimmed, date)
      setTitle('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setTitle('')
      inputRef.current?.blur()
    }
  }

  return (
    <div className="flex items-center gap-3 py-2 mt-1">
      <div className="w-4 h-4 rounded-full border border-dashed border-gray-300 flex-shrink-0" />
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false)
          if (title.trim()) handleSave()
        }}
        onKeyDown={handleKeyDown}
        placeholder="Add task..."
        className="flex-1 bg-transparent outline-none text-base placeholder:text-gray-300"
      />
    </div>
  )
}
