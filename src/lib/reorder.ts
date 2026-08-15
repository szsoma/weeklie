import { fractionalIndex } from './fractional-index.ts'

export type OrderedTask = { id: string; order: number }

/**
 * Fractional order value for inserting at `targetIndex` within `orders`
 * (ascending, with the dragged task already removed).
 */
export function computeOrderAtIndex(orders: number[], targetIndex: number): number {
  if (orders.length === 0) return 1

  const clamped = Math.max(0, Math.min(targetIndex, orders.length))
  const before = clamped === 0 ? null : orders[clamped - 1]
  const after = clamped === orders.length ? null : orders[clamped]

  return fractionalIndex(before, after)
}

/**
 * Order value for dropping `activeId` onto `overTaskId` inside a column.
 *
 * `targetColumnTasks` must be the destination column's tasks sorted ascending by
 * order, including the dragged task when it started in this column. Pass
 * `overTaskId: null` when the drop landed on the column background.
 *
 * When dragging downward within the same column the task settles *below* the
 * hovered row, matching how a vertical sortable list reads; in every other case
 * it settles above.
 */
export function computeDropOrder(
  targetColumnTasks: OrderedTask[],
  activeId: string,
  overTaskId: string | null,
): number {
  const without = targetColumnTasks.filter((task) => task.id !== activeId)
  const orders = without.map((task) => task.order)

  if (overTaskId === null) return computeOrderAtIndex(orders, orders.length)

  const overIndex = without.findIndex((task) => task.id === overTaskId)
  if (overIndex === -1) return computeOrderAtIndex(orders, orders.length)

  const activeIndexBefore = targetColumnTasks.findIndex((task) => task.id === activeId)
  const overIndexBefore = targetColumnTasks.findIndex((task) => task.id === overTaskId)
  const draggingDown = activeIndexBefore !== -1 && activeIndexBefore < overIndexBefore

  return computeOrderAtIndex(orders, draggingDown ? overIndex + 1 : overIndex)
}
