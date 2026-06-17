import { useEffect, useState } from 'react'

type Props = {
  message: string
  onUndo?: () => void
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, onUndo, onDismiss, duration = 5000 }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  return (
    <div
      className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] left-1/2 -translate-x-1/2 bg-ink text-bg px-4 py-2 rounded-md shadow-lg z-50 flex items-center gap-3 transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className="text-[14px]">{message}</span>
      {onUndo && (
        <button
          onClick={onUndo}
          className="text-sm underline hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg/20 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          Undo
        </button>
      )}
    </div>
  )
}
