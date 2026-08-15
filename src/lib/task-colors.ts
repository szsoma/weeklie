export const TASK_COLOR_TOKENS = ['red', 'orange', 'yellow', 'green'] as const

export type TaskColorToken = (typeof TASK_COLOR_TOKENS)[number]

export const TASK_COLOR_HEX: Record<TaskColorToken, string> = {
  red: '#e74c3c',
  orange: '#e67e22',
  yellow: '#eab308',
  green: '#22c55e',
}

export function getTaskColorHex(color: string | null): string | null {
  if (!color) return null
  if (!(color in TASK_COLOR_HEX)) return null
  return TASK_COLOR_HEX[color as TaskColorToken]
}
