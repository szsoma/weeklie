import { useEffect, useState } from 'react'
import { getWeekStart, weekContainsToday } from '../dates'

const TODAY_FOCUS_KEY = 'weeklie.todayFocus'

function readInitialFocus(): boolean {
  try {
    return globalThis.localStorage?.getItem(TODAY_FOCUS_KEY) === '1'
  } catch {
    return false
  }
}

export function useTodayFocus(currentWeekStart: Date) {
  const [todayFocus, setTodayFocusState] = useState(readInitialFocus)
  const canFocusToday = weekContainsToday(currentWeekStart)

  const setTodayFocus = (value: boolean) => {
    setTodayFocusState(value)
    try {
      globalThis.localStorage?.setItem(TODAY_FOCUS_KEY, value ? '1' : '0')
    } catch {
      // Ignore localStorage failures.
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      const visibleWeekStart = getWeekStart(new Date())
      if (visibleWeekStart.getTime() !== currentWeekStart.getTime() && todayFocus) {
        setTodayFocus(false)
      }
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [currentWeekStart, todayFocus])

  return {
    todayFocus: todayFocus && canFocusToday,
    canFocusToday,
    setTodayFocus,
    toggleTodayFocus: () => setTodayFocus(!todayFocus),
  }
}
