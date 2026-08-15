export const MARK_DONE_MESSAGE_TYPE = 'weeklie:mark-done'
export const MARK_DONE_ACTION = 'mark-done'

/**
 * Returns the task id to complete, or null.
 *
 * The service worker posts a message on every notification click so the app can
 * focus itself. Only an explicit "Mark done" action button press should complete
 * the task — a plain tap on the notification body reports action "".
 */
export function getTaskIdToComplete(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const message = data as Record<string, unknown>
  if (message.type !== MARK_DONE_MESSAGE_TYPE) return null
  if (message.action !== MARK_DONE_ACTION) return null
  const taskId = message.taskId
  if (typeof taskId !== 'string' || taskId.length === 0) return null
  return taskId
}
