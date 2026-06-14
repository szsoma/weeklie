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
      className={`relative flex flex-col min-h-0 h-full ${today ? "bg-today" : "bg-bg"}`}
    >
      {/* Today accent — a hairline ink cap across the column top */}
      {today && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-ink z-20" />
      )}

      <div
        className="sticky top-0 z-10 font-bold md:static px-5 md:px-6 pt-5 pb-4 flex items-baseline justify-between gap-2 border-b border-rule"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-mono font-semibold text-[20px] leading-none tabular-nums text-ink">
            {String(dayNum).padStart(2, "0")}
          </span>
          <span className="font-mono text-[20px] uppercase text-muted leading-none">
            {monthName}
          </span>
        </div>
        <span
          className={`font-mono text-[20px] uppercase leading-none ${
            today ? "text-ink font-semibold" : "text-faint"
          }`}
        >
          {dayName}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 md:px-6 pb-5">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}

        {/* Empty ruled slots — fill the column like notebook lines */}
        {Array.from({ length: Math.max(0, 3 - tasks.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-start gap-3.5 py-3.5 pr-1.5 border-b border-rule"
          >
            <div className="w-[18px] h-[18px] mt-[3px] rounded-full flex-shrink-0 border border-dashed border-rule-strong/60" />
            <div className="flex-1" />
            <div
              className="w-6 h-6 mt-[1px] flex-shrink-0"
              aria-hidden="true"
            />
            <div
              className="w-6 h-6 mt-[1px] flex-shrink-0"
              aria-hidden="true"
            />
          </div>
        ))}

        <NewTaskLine date={formatDate(date)} />
      </div>
    </div>
  );
}
