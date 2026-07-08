import { useEffect } from 'react'
import { focusBacklogSearchInput, focusNewTaskInput, isEditableShortcutTarget } from '../lib/keyboard'
import { useStore } from '../store'

export function useGlobalShortcuts() {
  const openQuickCapture = useStore(s => s.openQuickCapture)
  const openKeyboardHelp = useStore(s => s.openKeyboardHelp)
  const toggleTodayFocus = useStore(s => s.toggleTodayFocus)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableShortcutTarget(event.target)) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        openQuickCapture()
        return
      }

      if (event.key === "/") {
        event.preventDefault()
        focusBacklogSearchInput()
        return
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault()
        toggleTodayFocus()
        return
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault()
        focusNewTaskInput(useStore.getState().focusedColumnId)
        return
      }

      if (event.key === "?") {
        event.preventDefault()
        openKeyboardHelp()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [openKeyboardHelp, openQuickCapture, toggleTodayFocus])
}
