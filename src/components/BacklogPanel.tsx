import { useMemo, useState } from "react";
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
  const setFocusedColumn = useStore((s) => s.setFocusedColumn);
  const setBacklogSearchFocused = useStore((s) => s.setBacklogSearchFocused);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTasks = useMemo(
    () =>
      normalizedQuery
        ? tasks.filter((task) => task.title.toLowerCase().includes(normalizedQuery))
        : tasks,
    [normalizedQuery, tasks],
  );

  return (
    <div
      ref={setNodeRef}
      data-column-id="backlog"
      tabIndex={0}
      onFocus={() => setFocusedColumn("backlog")}
      className="weeklie-focus-ring bg-bg flex flex-col min-h-[18rem] md:min-h-0 md:h-full"
    >
      <div className="flex items-center gap-2 px-4 sm:px-6 md:px-2 min-h-[44px] border-b border-rule">
        <h2 className="font-mono font-semibold text-[18px] uppercase tracking-[-0.02em] text-muted">
          Backlog
        </h2>
        <span className="font-mono font-semibold text-[18px] text-faint tabular-nums">
          {filteredTasks.length}
        </span>
        <div className="ml-auto flex items-center min-w-0 max-w-[12rem] h-8 rounded-full bg-ink/[0.035] px-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setBacklogSearchFocused(true)}
            onBlur={() => setBacklogSearchFocused(false)}
            placeholder="Filter..."
            aria-label="Filter backlog tasks"
            name="backlog-filter"
            className="w-full min-w-0 bg-transparent font-mono text-[12px] text-ink placeholder:text-faint outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear backlog filter"
              className="ml-2 text-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              x
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 md:px-2 py-3 md:pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
          {filteredTasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
          {normalizedQuery && filteredTasks.length === 0 && (
            <div className="col-span-full px-2 py-3 font-mono text-[12px] text-faint">
              No backlog tasks matching "{query.trim()}".
            </div>
          )}
        </div>
        <NewTaskLine date={null} />
      </div>
    </div>
  );
}
