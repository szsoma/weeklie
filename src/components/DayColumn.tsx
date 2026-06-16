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
      <div
        className="sticky top-0 z-10 md:static px-2 min-h-[44px] flex items-center justify-between gap-2 border-b border-rule"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-mono font-semibold text-[18px] leading-none tabular-nums text-ink">
            {String(dayNum).padStart(2, "0")}
          </span>
          <span className="font-mono font-semibold text-[18px] text-ink leading-none">
            {monthName}
          </span>
        </div>
        <span className="font-mono text-[18px] leading-none text-muted">
          {dayName}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-5 md:pb-24">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}

        <NewTaskLine date={formatDate(date)} />
      </div>
    </div>
  );
}
