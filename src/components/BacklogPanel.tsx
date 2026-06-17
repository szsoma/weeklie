import { useDroppable } from "@dnd-kit/core";
import { useStore } from "../store";
import { useShallow } from "zustand/shallow";
import TaskRow from "./TaskRow";
import NewTaskLine from "./NewTaskLine";

export default function BacklogPanel() {
  const { setNodeRef } = useDroppable({
    id: "backlog",
    data: { date: null },
  });
  const tasks = useStore(
    useShallow((s) =>
      s.tasks
        .filter((t) => t.date === null && !(s.hideDone && t.done))
        .sort((a, b) => a.order - b.order),
    ),
  );

  return (
    <div
      ref={setNodeRef}
      className="bg-bg flex flex-col min-h-[18rem] md:min-h-0 md:h-full"
    >
      <div className="flex items-center gap-2 px-4 sm:px-6 md:px-2 min-h-[44px] border-b border-rule">
        <h2 className="font-mono font-semibold text-[18px] uppercase tracking-[-0.02em] text-muted">
          Backlog
        </h2>
        <span className="font-mono font-semibold text-[18px] text-faint tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 md:px-2 py-3 md:pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
        <NewTaskLine date={null} />
      </div>
    </div>
  );
}
