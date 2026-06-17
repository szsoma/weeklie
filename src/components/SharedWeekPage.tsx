import { useEffect, useState } from 'react'
import SharedWeekGrid from './SharedWeekGrid'
import { formatWeekLabel } from '../dates'
import { loadSharedWeek } from '../lib/week-share'
import type { SharedWeekAvailable, SharedWeekResponse } from '../types'

type Props = {
  token: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; week: SharedWeekAvailable }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`)
}

function isSharedWeekAvailable(
  response: SharedWeekResponse
): response is SharedWeekAvailable {
  return response.ok
}

export default function SharedWeekPage({ token }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let alive = true

    setState({ status: 'loading' })

    loadSharedWeek(token)
      .then((response) => {
        if (!alive) return

        if (isSharedWeekAvailable(response)) {
          setState({ status: 'ready', week: response })
          return
        }

        setState({ status: 'unavailable' })
      })
      .catch((error: unknown) => {
        if (!alive) return

        setState({
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Unexpected error',
        })
      })

    return () => {
      alive = false
    }
  }, [token])

  return (
    <main className="min-h-[100dvh] bg-bg text-ink">
      {state.status === 'loading' && (
        <div className="grid min-h-[100dvh] place-items-center px-6">
          <div className="space-y-3 text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-faint">
              Shared week plan
            </p>
            <p className="font-mono text-sm text-muted" role="status">
              Loading shared week...
            </p>
          </div>
        </div>
      )}

      {state.status === 'unavailable' && (
        <div className="grid min-h-[100dvh] place-items-center px-6">
          <div className="max-w-md space-y-3 text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-faint">
              Shared week
            </p>
            <h1 className="font-mono text-[28px] font-semibold tracking-tight">
              This link is unavailable
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              The share link may have been revoked or mistyped.
            </p>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="grid min-h-[100dvh] place-items-center px-6">
          <div className="max-w-md space-y-3 text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-faint">
              Shared week
            </p>
            <h1 className="font-mono text-[28px] font-semibold tracking-tight">
              Could not load this week
            </h1>
            <p className="text-sm leading-relaxed text-muted">{state.message}</p>
          </div>
        </div>
      )}

      {state.status === 'ready' && (
        <div className="flex min-h-[100dvh] flex-col overflow-hidden">
          <header className="flex items-end justify-between gap-4 border-b-2 border-rule px-4 py-4 sm:px-6 md:px-8">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Shared week plan
              </p>
              <h1 className="mt-1 font-mono text-[24px] font-semibold tracking-tight text-ink md:text-[22px]">
                {formatWeekLabel(parseDateKey(state.week.week_start))}
              </h1>
            </div>
          </header>

          {state.week.tasks.length === 0 ? (
            <div className="grid flex-1 place-items-center px-6 py-10 text-center">
              <div className="max-w-md space-y-3">
                <h2 className="font-mono text-[28px] font-semibold tracking-tight text-ink">
                  No scheduled tasks shared
                </h2>
                <p className="text-sm leading-relaxed text-muted">
                  This week has no scheduled tasks in the shared view.
                </p>
              </div>
            </div>
          ) : (
            <SharedWeekGrid
              weekStart={parseDateKey(state.week.week_start)}
              tasks={state.week.tasks}
            />
          )}
        </div>
      )}
    </main>
  )
}
