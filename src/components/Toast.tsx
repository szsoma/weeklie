import { useEffect } from 'react'

type Props = {
  message: string
  onDismiss: () => void
}

export default function Toast({ message, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded shadow-lg text-sm">
      {message}
    </div>
  )
}
