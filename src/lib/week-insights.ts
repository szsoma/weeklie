import type { DayCheckin, Habit, HabitEntry, Task } from '../types'

export type DayCheckinSummary = {
  averageEnergy: number | null;
  mostCommonMood: string | null;
  bestEnergyDay: string | null;
  lowestEnergyDay: string | null;
  energyCompletionInsight: string | null;
}

export function summarizeDayCheckins(
  checkins: DayCheckin[],
  tasks: Task[],
): DayCheckinSummary {
  const withEnergy = checkins.filter(checkin => typeof checkin.energy === 'number')
  const averageEnergy = withEnergy.length > 0
    ? Math.round((withEnergy.reduce((sum, checkin) => sum + (checkin.energy ?? 0), 0) / withEnergy.length) * 10) / 10
    : null

  const moodCounts = new Map<string, number>()
  for (const checkin of checkins) {
    if (!checkin.mood) continue
    moodCounts.set(checkin.mood, (moodCounts.get(checkin.mood) ?? 0) + 1)
  }
  const mostCommonMood = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const sortedEnergy = [...withEnergy].sort((a, b) => (b.energy ?? 0) - (a.energy ?? 0))
  const bestEnergyDay = sortedEnergy[0]?.date ?? null
  const lowestEnergyDay = sortedEnergy[sortedEnergy.length - 1]?.date ?? null

  const energyCompletionInsight = withEnergy.length >= 3
    ? buildEnergyCompletionInsight(withEnergy, tasks)
    : null

  return {
    averageEnergy,
    mostCommonMood,
    bestEnergyDay,
    lowestEnergyDay,
    energyCompletionInsight,
  }
}

function buildEnergyCompletionInsight(checkins: DayCheckin[], tasks: Task[]): string | null {
  const byDate = checkins.map(checkin => {
    const dayTasks = tasks.filter(task => task.date === checkin.date)
    const completed = dayTasks.filter(task => task.done).length
    return {
      energy: checkin.energy ?? 0,
      completionRate: dayTasks.length === 0 ? 0 : completed / dayTasks.length,
    }
  })

  const highEnergy = byDate.filter(day => day.energy >= 4)
  const lowerEnergy = byDate.filter(day => day.energy < 4)
  if (highEnergy.length === 0 || lowerEnergy.length === 0) return null

  const highRate = highEnergy.reduce((sum, day) => sum + day.completionRate, 0) / highEnergy.length
  const lowerRate = lowerEnergy.reduce((sum, day) => sum + day.completionRate, 0) / lowerEnergy.length

  return highRate > lowerRate + 0.15
    ? 'You completed the most tasks on higher-energy days.'
    : null
}

export type HabitSummary = {
  rows: { habit: Habit; completed: number; total: number }[];
  bestHabit: Habit | null;
  lowestConsistencyHabit: Habit | null;
}

export function summarizeHabits(habits: Habit[], entries: HabitEntry[]): HabitSummary {
  const rows = habits.map(habit => ({
    habit,
    completed: entries.filter(entry => entry.habit_id === habit.id && entry.completed).length,
    total: 7,
  }))
  const sorted = [...rows].sort((a, b) => b.completed - a.completed)
  return {
    rows,
    bestHabit: sorted[0]?.habit ?? null,
    lowestConsistencyHabit: sorted[sorted.length - 1]?.habit ?? null,
  }
}
