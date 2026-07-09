import { useEffect, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useDndContext, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Session } from '@supabase/supabase-js'
import AboutScreen from './components/AboutScreen'
import AuthScreen from './components/AuthScreen'
import FeaturesScreen from './components/FeaturesScreen'
import FloatingNav from './components/FloatingNav'
import KeyboardShortcutsDialog from './components/KeyboardShortcutsDialog'
import QuickCaptureDialog from './components/QuickCaptureDialog'
import ReviewScreen from './components/ReviewScreen'
import ShareWeekDialog from './components/ShareWeekDialog'
import SharedWeekPage from './components/SharedWeekPage'
import Toast from './components/Toast'
import WeekGrid from './components/WeekGrid'
import WeekHeader from './components/WeekHeader'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useRollover } from './hooks/useRollover'
import { startReminderScheduler } from './lib/reminders'
import { startWeeklyHabitScheduler } from './lib/scheduler'
import { supabase } from './lib/supabase'
import { useStore } from './store'

function decodeShareToken(token: string) {
  try {
    return decodeURIComponent(token)
  } catch {
    return token
  }
}

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
  const shareMatch = window.location.pathname.match(/^\/share\/([^/]+)$/)
  if (shareMatch) {
    return <SharedWeekPage token={decodeShareToken(shareMatch[1])} />
  }

  return <AuthenticatedApp />
}

function AuthenticatedApp() {
  const { toast: rolloverToast, clearToast } = useRollover()
  const moveTask = useStore(s => s.moveTask)
  const loadTasks = useStore(s => s.loadTasks)
  const loadEvents = useStore(s => s.loadEvents)
  const loadReviews = useStore(s => s.loadReviews)
  const loadDayCheckinsForWeek = useStore(s => s.loadDayCheckinsForWeek)
  const loadHabitTemplates = useStore(s => s.loadHabitTemplates)
  const loadHabitInstancesForWeek = useStore(s => s.loadHabitInstancesForWeek)
  const generateHabitInstancesForWeek = useStore(s => s.generateHabitInstancesForWeek)
  const currentWeekStart = useStore(s => s.currentWeekStart)
  const isLoading = useStore(s => s.isLoading)
  const tasks = useStore(s => s.tasks)
  const toggleDone = useStore(s => s.toggleDone)
  const openQuickCapture = useStore(s => s.openQuickCapture)
  const clearSessionData = useStore(s => s.clearSessionData)

  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const [showShare, setShowShare] = useState(false)

  useGlobalShortcuts()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) clearSessionData()
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) clearSessionData()
      setAuthReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [clearSessionData])

  useEffect(() => {
    if (!session) return
    loadTasks()
    loadEvents()
    loadReviews()
  }, [session, loadTasks, loadEvents, loadReviews])

  useEffect(() => {
    if (!session) return
    loadDayCheckinsForWeek(currentWeekStart)
  }, [session, currentWeekStart, loadDayCheckinsForWeek])

  useEffect(() => {
    if (!session || isLoading) return
    return startReminderScheduler(() => useStore.getState().tasks)
  }, [session, isLoading, tasks])

  useEffect(() => {
    if (!session) return
    const run = async () => {
      await loadHabitTemplates()
      await loadHabitInstancesForWeek(currentWeekStart)
      await generateHabitInstancesForWeek(currentWeekStart)
    }
    run()
  }, [session, currentWeekStart, loadHabitTemplates, loadHabitInstancesForWeek, generateHabitInstancesForWeek])

  useEffect(() => {
    if (!session) return
    return startWeeklyHabitScheduler((weekStart) => {
      generateHabitInstancesForWeek(weekStart)
    })
  }, [session, generateHabitInstancesForWeek])

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
      const tasksForTarget = useStore.getState().tasks.filter(t => t.date === targetDate && t.id !== taskId)
      targetOrder = tasksForTarget.length > 0
        ? Math.max(...tasksForTarget.map(t => t.order)) + 1
        : 1
    }

    moveTask(taskId, targetDate, targetOrder)
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Failed to sign out', error)
    }
  }

  if (!authReady) {
    return (
      <div className="h-[100dvh] grid place-items-center">
        <span className="font-mono text-sm text-muted">Loading...</span>
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
            <span className="font-mono text-sm text-muted">Loading your week...</span>
          </div>
        ) : (
          <>
            <WeekHeader
              onShowReview={() => setShowReview(true)}
              onShowShare={() => setShowShare(true)}
            />
            <WeekGrid />
            <FloatingNav
              isAuthenticated={Boolean(session)}
              onLogout={handleLogout}
              onShowAbout={() => setShowAbout(true)}
              onShowFeatures={() => setShowFeatures(true)}
              onOpenQuickCapture={openQuickCapture}
            />
          </>
        )}
      </div>
      {showReview && <ReviewScreen onClose={() => setShowReview(false)} />}
      {showShare && (
        <ShareWeekDialog
          weekStart={currentWeekStart}
          onClose={() => setShowShare(false)}
        />
      )}
      <QuickCaptureDialog />
      <KeyboardShortcutsDialog />
      {showAbout && <AboutScreen onClose={() => setShowAbout(false)} />}
      {showFeatures && <FeaturesScreen onClose={() => setShowFeatures(false)} />}
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
