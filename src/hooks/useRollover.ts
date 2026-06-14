import { useEffect, useState } from 'react'
import { useStore } from '../store'

export function useRollover() {
  const [toast, setToast] = useState<{ message: string; count: number } | null>(null)
  const isLoading = useStore((s) => s.isLoading)

  useEffect(() => {
    if (isLoading) return // wait until the first load completes
    const run = async () => {
      const count = await useStore.getState().rolloverTasks()
      if (count > 0) {
        setToast({ message: `${count} task${count > 1 ? 's' : ''} moved to today`, count })
      }
    }
    run()
  }, [isLoading])

  return { toast, clearToast: () => setToast(null) }
}
