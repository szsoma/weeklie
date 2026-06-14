import { useState, useRef } from 'react'
import { useStore } from '../store'

type Props = {
  date: string | null // null = Backlog
}

export default function NewTaskLine({ date }: Props) {
  const [title, setTitle] = useState('')
  const [isFocused, setIsFocused] = useState(false)
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
    <div
      className={`flex items-center gap-2.5 py-2 pr-1 mt-0.5 rounded transition-colors ${
        isFocused ? 'bg-ink/[0.025]' : 'hover:bg-ink/[0.025]'
      }`}
    >
      <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-dashed border-rule-strong/70" />
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
        placeholder="Add task…"
        className="flex-1 bg-transparent outline-none text-[15px] leading-snug text-ink placeholder:text-faint"
      />
    </div>
  )
}
