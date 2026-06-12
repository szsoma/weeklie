export function fractionalIndex(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1
  if (before === null) return after! - 1
  if (after === null) return before + 1
  return (before + after) / 2
}

export function reorderBetween(
  tasks: { id: string; order: number }[],
  activeId: string,
  overId: string
): { id: string; order: number }[] {
  const activeIdx = tasks.findIndex(t => t.id === activeId)
  const overIdx = tasks.findIndex(t => t.id === overId)

  if (activeIdx === -1 || overIdx === -1) return tasks

  const before = overIdx > 0 ? tasks[overIdx - 1].order : null
  const after = overIdx < tasks.length - 1 ? tasks[overIdx + 1].order : null

  const newOrder = fractionalIndex(before, after)

  return tasks.map(t =>
    t.id === activeId ? { ...t, order: newOrder } : t
  )
}
