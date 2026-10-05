export async function loadHabitBase(deps: {
  loadTasks: () => Promise<boolean>
  loadTemplates: () => Promise<boolean>
}): Promise<boolean> {
  const [tasksLoaded, templatesLoaded] = await Promise.all([
    deps.loadTasks(),
    deps.loadTemplates(),
  ])
  return tasksLoaded && templatesLoaded
}

export async function loadHabitWeek(
  weekStart: Date,
  deps: {
    loadInstances: (weekStart: Date) => Promise<boolean>
    generate: (weekStart: Date) => Promise<void>
  },
): Promise<boolean> {
  if (!await deps.loadInstances(weekStart)) return false
  await deps.generate(weekStart)
  return true
}
