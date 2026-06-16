import { useDroppable } from "@dnd-kit/core";
import { useStore } from "../store";
import { useShallow } from "zustand/shallow";
import { formatDate, isToday } from "../dates";
import TaskRow from "./TaskRow";
import NewTaskLine from "./NewTaskLine";

type Props = {
  date: Date;
};

export default function DayColumn({ date }: Props) {
  const tasks = useStore(
    useShallow((s) =>
      s.tasks
        .filter((t) => t.date === formatDate(date) && !(s.hideDone && t.done))
        .sort((a, b) => a.order - b.order),
    ),
  );

  const { setNodeRef } = useDroppable({
    id: `day-${formatDate(date)}`,
    data: { date: formatDate(date) },
  });

  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const monthName = date.toLocaleDateString("en-US", { month: "short" });
  const dayNum = date.getDate();
  const today = isToday(date);

  return (
    <div
      ref={setNodeRef}
      className={`relative flex flex-col min-h-0 md:h-full ${today ? "bg-today" : "bg-bg"}`}
    >
      {/* Today accent — a hairline ink cap across the column top */}
      {today && (
        <div className="absolute inset-x-0 top-0 h-px bg-rule-strong z-20" />
      )}

      <div
        className="sticky top-0 z-10 md:static px-4 sm:px-6 md:px-8 py-3 flex items-baseline justify-between gap-2 border-b border-rule"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-mono font-semibold text-[18px] leading-none tabular-nums text-ink">
            {String(dayNum).padStart(2, "0")}
          </span>
          <span className="font-mono text-[18px] uppercase text-faint leading-none">
            {monthName}
          </span>
        </div>
        <span
          className={`font-mono text-[18px] uppercase leading-none ${
            today ? "text-ink font-semibold" : "text-muted"
          }`}
        >
          {dayName}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 md:px-8 pb-5 md:pb-24">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}

        {/* Empty ruled slots — mirror TaskRow layout (checkbox + spacer + kebab) */}
        {Array.from({ length: Math.max(0, 3 - tasks.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-2 px-2 py-2 border-b border-rule"
          >
            <div className="w-5 h-5 rounded-[7px] flex-shrink-0 border border-dashed border-rule-strong/60" />
            <div className="flex-1" />
            <div
              className="w-5 h-5 flex-shrink-0"
              aria-hidden="true"
            />
          </div>
        ))}

        <NewTaskLine date={formatDate(date)} />
      </div>
    </div>
  );
}
