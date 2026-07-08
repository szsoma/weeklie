import { useState } from "react";
import { formatDate } from "../dates";
import { useStore } from "../store";
import type { Habit } from "../types";

type Props = {
  habit: Habit;
  days: Date[];
};

export default function HabitRow({ habit, days }: Props) {
  const [expanded, setExpanded] = useState(false);
  const entries = useStore((s) => s.habitEntries.filter((entry) => entry.habit_id === habit.id));
  const toggleHabitEntry = useStore((s) => s.toggleHabitEntry);
  const archiveHabit = useStore((s) => s.archiveHabit);
  const completedCount = entries.filter((entry) => entry.completed).length;
  const menuId = `habit-menu-${habit.id}`;

  return (
    <div className="grid gap-2 rounded-lg border border-rule bg-bg/40 p-2 md:grid-cols-[minmax(8rem,1fr)_auto_auto] md:items-center">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="min-w-0 text-left md:pointer-events-none"
        aria-expanded={expanded}
      >
        <div className="truncate text-sm font-medium text-ink">{habit.title}</div>
        <div className="font-mono text-[11px] text-faint md:hidden">{completedCount}/7</div>
      </button>
      <div className={`${expanded ? "grid" : "hidden"} grid-cols-7 gap-1 md:grid`}>
        {days.map((day) => {
          const date = formatDate(day);
          const completed = entries.some((entry) => entry.date === date && entry.completed);
          return (
            <button
              key={date}
              type="button"
              aria-label={`${habit.title} ${date}`}
              aria-pressed={completed}
              onClick={() => toggleHabitEntry(habit.id, date)}
              className={`h-8 rounded-full border font-mono text-[11px] ${
                completed ? "border-ink bg-ink text-bg" : "border-rule text-faint"
              }`}
            >
              {day.toLocaleDateString("en-US", { weekday: "narrow" })}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        popoverTarget={menuId}
        aria-label={`Habit options for ${habit.title}`}
        className="justify-self-end rounded-full px-2 text-faint hover:bg-ink/[0.05] hover:text-ink"
      >
        ...
      </button>
      <div id={menuId} popover="auto" className="task-settings-popover">
        <div className="p-3">
          <button
            type="button"
            onClick={() => archiveHabit(habit.id)}
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-ink hover:bg-ink/[0.06]"
          >
            Archive habit
          </button>
        </div>
      </div>
    </div>
  );
}
