import { useEffect, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDndContext } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Session } from '@supabase/supabase-js'
import FloatingNav from './components/FloatingNav'
import WeekHeader from './components/WeekHeader'
import WeekGrid from './components/WeekGrid'
import ReviewScreen from './components/ReviewScreen'
import AuthScreen from './components/AuthScreen'
import { supabase } from './lib/supabase'
import { useStore } from './store'
import { useRollover } from './hooks/useRollover'
import Toast from './components/Toast'
import AboutScreen from './components/AboutScreen'
import { useTodayFocus } from './hooks/useTodayFocus'
import { startReminderScheduler } from './lib/reminders'

function TaskDragOverlay() {
  const { active } = useDndContext()
  const activeTask = useStore(s =>
    active?.id ? s.tasks.find(t => t.id === active.id) ?? null : null
  )

  if (!activeTask) return null

  return (
    <DragOverlay dropAnimation={null}>
      <div className="opacity-95 bg-ink text-bg rounded-full px-5 h-12 inline-flex items-center gap-2 shadow-[0_24px_50px_-14px_rgba(0,0,0,0.5)] text-[15px] font-medium cursor-grabbing max-w-[80vw]">
        <span className="truncate">{activeTask.title}</span>
      </div>
    </DragOverlay>
  )
}

export default function App() {
  const { toast: rolloverToast, clearToast } = useRollover()
  const moveTask = useStore(s => s.moveTask)
  const loadTasks = useStore(s => s.loadTasks)
  const loadEvents = useStore(s => s.loadEvents)
  const loadReviews = useStore(s => s.loadReviews)
  const isLoading = useStore(s => s.isLoading)
  const currentWeekStart = useStore(s => s.currentWeekStart)
  const tasks = useStore(s => s.tasks)
  const toggleDone = useStore(s => s.toggleDone)
  const todayFocusState = useTodayFocus(currentWeekStart)

  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setAuthReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    loadTasks()
    loadEvents()
    loadReviews()
  }, [session, loadTasks, loadEvents, loadReviews])

  useEffect(() => {
    if (!session || isLoading) return
    return startReminderScheduler(() => useStore.getState().tasks)
  }, [session, isLoading, tasks])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'weeklie:mark-done') return
      const taskId = event.data.taskId as string | undefined
      if (!taskId) return
      const task = useStore.getState().tasks.find((item) => item.id === taskId)
      if (task && !task.done) toggleDone(taskId)
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [toggleDone])

  const [showReview, setShowReview] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const targetDate = over.data.current?.date as string | null
    let targetOrder = over.data.current?.order as number | undefined

    if (targetDate === undefined) return

    if (targetOrder === undefined) {
      const tasks = useStore.getState().tasks.filter(t => t.date === targetDate && t.id !== taskId)
      targetOrder = tasks.length > 0
        ? Math.max(...tasks.map(t => t.order)) + 1
        : 1
    }

    moveTask(taskId, targetDate, targetOrder)
  }

  if (!authReady) {
    return (
      <div className="h-[100dvh] grid place-items-center">
        <span className="font-mono text-sm text-muted">Loading…</span>
      </div>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <div className="h-[100dvh] flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="h-[100dvh] grid place-items-center">
            <span className="font-mono text-sm text-muted">Loading your week…</span>
          </div>
        ) : (
          <>
            <WeekHeader
              onShowReview={() => setShowReview(true)}
              todayFocus={todayFocusState.todayFocus}
              canFocusToday={todayFocusState.canFocusToday}
              onToggleTodayFocus={todayFocusState.toggleTodayFocus}
            />
            <WeekGrid todayFocus={todayFocusState.todayFocus} />
            <FloatingNav
              onShowAbout={() => setShowAbout(true)}
              todayFocus={todayFocusState.todayFocus}
              canFocusToday={todayFocusState.canFocusToday}
              onToggleTodayFocus={todayFocusState.toggleTodayFocus}
            />
          </>
        )}
      </div>
      {showReview && <ReviewScreen onClose={() => setShowReview(false)} />}
      {showAbout && <AboutScreen onClose={() => setShowAbout(false)} />}
      {rolloverToast && (
        <Toast
          message={rolloverToast.message}
          onDismiss={clearToast}
        />
      )}
      <TaskDragOverlay />
    </DndContext>
  )
}
