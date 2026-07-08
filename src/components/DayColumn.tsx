import { useDroppable } from "@dnd-kit/core";
import { useStore } from "../store";
import { useShallow } from "zustand/shallow";
import { formatDate, isToday } from "../dates";
import TaskRow from "./TaskRow";
import NewTaskLine from "./NewTaskLine";
import DayCheckinButton from "./DayCheckinButton";

type Props = {
  date: Date;
};

export default function DayColumn({ date }: Props) {
  const dateKey = formatDate(date);
  const tasks = useStore(
    useShallow((s) =>
      s.tasks
        .filter((t) => t.date === dateKey && !(s.hideDone && t.done))
        .sort((a, b) => a.order - b.order),
    ),
  );
  const setFocusedColumn = useStore((s) => s.setFocusedColumn);

  const { setNodeRef } = useDroppable({
    id: `day-${dateKey}`,
    data: { date: dateKey },
  });

  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const monthName = date.toLocaleDateString("en-US", { month: "short" });
  const dayNum = date.getDate();
  const today = isToday(date);

  return (
    <div
      ref={setNodeRef}
      data-column-id={dateKey}
      tabIndex={0}
      onFocus={() => setFocusedColumn(dateKey)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          document
            .querySelector<HTMLInputElement>(`[data-new-task-column="${dateKey}"]`)
            ?.focus();
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const columns = Array.from(document.querySelectorAll<HTMLElement>("[data-column-id]"));
          const currentIndex = columns.findIndex((column) => column.dataset.columnId === dateKey);
          const next = columns[currentIndex + (event.key === "ArrowRight" ? 1 : -1)];
          next?.focus();
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          document
            .querySelector<HTMLElement>(`[data-task-column="${dateKey}"]`)
            ?.focus();
        }
      }}
      className={`relative flex flex-col min-h-0 md:h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-inset ${today ? "bg-today" : "bg-bg"}`}
    >
      <div
        className="sticky top-0 z-10 md:static px-2 min-h-[44px] flex items-center justify-between gap-2 border-b border-rule"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-mono font-semibold text-[18px] leading-none tabular-nums text-ink">
            {String(dayNum).padStart(2, "0")}
          </span>
          <span className="font-mono font-semibold text-[18px] uppercase text-ink leading-none">
            {monthName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <DayCheckinButton date={date} />
          <span className="font-mono text-[18px] leading-none text-muted">
            {dayName}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-5 md:pb-24">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}

        <NewTaskLine date={dateKey} />
      </div>
    </div>
  );
}
