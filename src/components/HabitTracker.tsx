import { useMemo } from "react";
import { getWeekDays } from "../dates";
import { useStore } from "../store";
import HabitAddInput from "./HabitAddInput";
import HabitRow from "./HabitRow";

export default function HabitTracker() {
  const currentWeekStart = useStore((s) => s.currentWeekStart);
  const allHabits = useStore((s) => s.habits);
  const habits = useMemo(
    () => allHabits.filter((habit) => !habit.archived),
    [allHabits],
  );
  const days = getWeekDays(currentWeekStart);

  return (
    <section className="border-b border-rule bg-bg px-4 py-3 sm:px-6 md:px-8">
      <div className="mx-auto max-w-none">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-mono text-[13px] font-semibold uppercase text-muted">Habits</h2>
          <span className="font-mono text-[11px] text-faint">{habits.length}</span>
        </div>
        <div className="grid gap-2">
          {habits.map((habit) => (
            <HabitRow key={habit.id} habit={habit} days={days} />
          ))}
          <HabitAddInput />
        </div>
      </div>
    </section>
  );
}
