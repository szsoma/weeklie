import { useEffect, useState } from 'react'
import { closestCenter, DndContext, DragOverlay, PointerSensor, TouchSensor, useDndContext, useSensor, useSensors } from '@dnd-kit/core'
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
import { getTaskIdToComplete } from './lib/notifications'
import { startReminderScheduler } from './lib/reminders'
import { computeDropOrder } from './lib/reorder'
import { startWeeklyHabitScheduler } from './lib/scheduler'
import { isOwnerSession } from './lib/owner-access'
import { ownerEmail, supabase } from './lib/supabase'
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
  const ownerSession = isOwnerSession(session, ownerEmail) ? session : null

  useGlobalShortcuts()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!isOwnerSession(data.session, ownerEmail)) clearSessionData()
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!isOwnerSession(s, ownerEmail)) clearSessionData()
      setAuthReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [clearSessionData])

  useEffect(() => {
    if (!authReady || !session || isOwnerSession(session, ownerEmail)) return
    void supabase.auth.signOut({ scope: 'local' }).then(({ error }) => {
      if (error) console.error('Failed to clear another account from this device', error)
    })
  }, [authReady, session])

  useEffect(() => {
    if (!ownerSession) return
    loadTasks()
    loadEvents()
    loadReviews()
  }, [ownerSession, loadTasks, loadEvents, loadReviews])

  useEffect(() => {
    if (!ownerSession) return
    loadDayCheckinsForWeek(currentWeekStart)
  }, [ownerSession, currentWeekStart, loadDayCheckinsForWeek])

  useEffect(() => {
    if (!ownerSession || isLoading) return
    return startReminderScheduler(() => useStore.getState().tasks)
  }, [ownerSession, isLoading, tasks])

  useEffect(() => {
    if (!ownerSession) return
    const run = async () => {
      await loadHabitTemplates()
      await loadHabitInstancesForWeek(currentWeekStart)
      await generateHabitInstancesForWeek(currentWeekStart)
    }
    run()
  }, [ownerSession, currentWeekStart, loadHabitTemplates, loadHabitInstancesForWeek, generateHabitInstancesForWeek])

  useEffect(() => {
    if (!ownerSession) return
    return startWeeklyHabitScheduler((weekStart) => {
      generateHabitInstancesForWeek(weekStart)
    })
  }, [ownerSession, generateHabitInstancesForWeek])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleMessage = (event: MessageEvent) => {
      const taskId = getTaskIdToComplete(event.data)
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
    if (!over) return

    const taskId = active.id as string
    const tasks = useStore.getState().tasks
    const activeTask = tasks.find((t) => t.id === taskId)
    if (!activeTask) return

    const overData = over.data.current
    const overIsTask = overData?.type === 'task'

    // Both a sortable row and a column droppable carry `date` in their data,
    // so this resolves the destination column either way.
    const targetDate = overData?.date as string | null | undefined
    if (targetDate === undefined) return

    const overTaskId = overIsTask ? (over.id as string) : null
    if (overTaskId === taskId && activeTask.date === targetDate) return

    const targetColumnTasks = tasks
      .filter((t) => t.date === targetDate)
      .sort((a, b) => a.order - b.order)

    const newOrder = computeDropOrder(targetColumnTasks, taskId, overTaskId)
    if (activeTask.date === targetDate && activeTask.order === newOrder) return

    moveTask(taskId, targetDate, newOrder)
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

  if (!ownerEmail) {
    return <div role="alert" className="min-h-[100dvh] grid place-items-center px-6 text-center text-muted">Set VITE_OWNER_EMAIL to the existing Supabase account email.</div>
  }

  if (!ownerSession) {
    return <AuthScreen />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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
