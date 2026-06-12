import { useEffect, useRef } from 'react'
import { useStore } from '../store'

export function useRollover() {
  const rolloverTasks = useStore(s => s.rolloverTasks)
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    rolloverTasks().then(count => {
      if (count > 0) {
        // Toast will be handled by Toast component
        console.log(`${count} tasks moved to today`)
      }
    })

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        rolloverTasks()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [rolloverTasks])
}
