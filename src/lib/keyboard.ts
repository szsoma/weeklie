export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target instanceof HTMLInputElement) return true
  if (target instanceof HTMLTextAreaElement) return true
  if (target instanceof HTMLSelectElement) return true
  return target.isContentEditable || target.closest('[contenteditable="true"]') !== null
}

export function focusBacklogSearchInput(): void {
  const input = document.querySelector<HTMLInputElement>('[name="backlog-filter"]')
  input?.focus()
}

export function focusNewTaskInput(columnId: string | 'backlog' | null): void {
  if (!columnId) return
  const selector = columnId === 'backlog'
    ? '[data-new-task-column="backlog"]'
    : `[data-new-task-column="${columnId}"]`
  document.querySelector<HTMLInputElement>(selector)?.focus()
}
