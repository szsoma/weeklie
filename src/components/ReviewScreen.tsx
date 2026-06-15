import { useState } from "react";
import { useStore } from "../store";
import { formatDate, getWeekDays, getWeekStart, getWeekId } from "../dates";
import { endOfISOWeek } from "date-fns";
import RingChart from "./RingChart";
import type { WeekReview } from "../types";

type Props = {
  onClose: () => void;
};

export default function ReviewScreen({ onClose }: Props) {
  const tasks = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const reviews = useStore((s) => s.reviews);
  const saveReview = useStore((s) => s.saveReview);
  const deleteTask = useStore((s) => s.deleteTask);
  const moveTask = useStore((s) => s.moveTask);

  const weekStart = getWeekStart(new Date());
  const weekEnd = endOfISOWeek(weekStart);
  const weekDays = getWeekDays(weekStart);
  const weekId = getWeekId(weekStart);

  const weekTasks = tasks.filter(
    (t) => t.date !== null && weekDays.some((d) => formatDate(d) === t.date),
  );

  const weekEvents = events.filter((e) => {
    const eventDate = e.created_at.slice(0, 10);
    return (
      eventDate >= formatDate(weekStart) && eventDate <= formatDate(weekEnd)
    );
  });

  const completedTaskIds = [
    ...new Set(
      weekEvents.filter((e) => e.type === "completed").map((e) => e.task_id),
    ),
  ];

  const rolledOverTaskIds = [
    ...new Set(
      weekEvents.filter((e) => e.type === "rolled-over").map((e) => e.task_id),
    ),
  ];

  const completed = tasks.filter((t) => completedTaskIds.includes(t.id));
  const rolledOver = tasks.filter((t) => rolledOverTaskIds.includes(t.id));

  const [reflection, setReflection] = useState("");

  const streak =
    reviews.length > 0 ? reviews[reviews.length - 1].streak + 1 : 1;

  const handleSave = () => {
    const now = new Date().toISOString();
    const review: WeekReview = {
      week_id: weekId,
      completed_count: completed.length,
      planned_count: weekTasks.length,
      rolled_over_count: rolledOver.length,
      reflection,
      viewed_at: now,
      streak,
      completed_task_ids: completedTaskIds,
      rolled_over_task_ids: rolledOverTaskIds,
      created_at: now,
      updated_at: now,
    };
    saveReview(review);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-bg z-50 overflow-y-auto p-6 md:p-8">
      <div className="bg-amber-50 max-w-lg mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] uppercase text-faint leading-none mb-1.5">
              Retrospective
            </span>
            <h2 className="font-mono font-semibold text-2xl tracking-tight leading-none">
              Weekly Review
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center w-9 h-9 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] transition"
          >
            ✕
          </button>
        </div>

        {/* Streak */}
        <div className="text-sm text-muted mb-4 font-mono">
          🔥 {streak}-week review streak
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mb-6">
          <RingChart completed={completed.length} total={weekTasks.length} />
          <div>
            <div className="text-2xl font-mono font-semibold tabular-nums">
              {completed.length} of {weekTasks.length}
            </div>
            <div className="text-sm text-muted">tasks completed</div>
          </div>
        </div>

        {/* Done list */}
        <div className="mb-6">
          <h3 className="font-mono text-[12px] uppercase text-faint mb-3">
            Completed
          </h3>
          {completed.map((task) => (
            <div
              key={task.id}
              className="text-[17px] line-through text-faint py-1 border-b border-rule"
            >
              {task.title}
            </div>
          ))}
        </div>

        {/* Rolled over */}
        {rolledOver.length > 0 && (
          <div className="mb-6">
            <h3 className="font-mono text-[12px] uppercase text-faint mb-3">
              Slipped
            </h3>
            {rolledOver.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 py-1.5 border-b2 border-rule"
              >
                <span className="text-[17px] flex-1">{task.title}</span>
                <span className="text-[11px] bg-ink/[0.06] px-2 py-0.5 rounded font-mono tabular-nums text-muted">
                  moved {task.rolled_over_count}×
                </span>
                <button
                  onClick={() =>
                    moveTask(task.id, formatDate(weekDays[0]), task.order)
                  }
                  className="text-[11px] font-mono uppercase text-ink hover:underline"
                >
                  Next wk
                </button>
                <button
                  onClick={() => moveTask(task.id, null, task.order)}
                  className="text-[11px] font-mono uppercase text-muted hover:text-ink hover:underline"
                >
                  Backlog
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-[11px] font-mono uppercase text-muted hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reflection */}
        <div className="mb-6">
          <h3 className="font-mono text-[12px] uppercase text-faint mb-3">
            Reflection
          </h3>
          <input
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="How was your week?"
            className="w-full bg-transparent border-b border-rule-strong outline-none py-2.5 text-[17px] placeholder:text-faint focus:border-ink transition-colors"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3.5 bg-ink text-bg rounded-md font-mono text-[14px] uppercase hover:opacity-80 active:scale-[0.99] transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
