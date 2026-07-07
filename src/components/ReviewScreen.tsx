import { useState } from "react";
import { useStore } from "../store";
import { formatDate, getWeekDays, getWeekStart, getWeekId } from "../dates";
import { endOfISOWeek } from "date-fns";
import RingChart from "./RingChart";
import WeekTrendBars from "./WeekTrendBars";
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
  const existingReview = reviews.find((review) => review.week_id === weekId);

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
      intention: existingReview?.intention ?? null,
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
    <div className="fixed inset-0 bg-bg z-50 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div className="bg-surface max-w-lg mx-auto px-5 sm:px-6 py-6 sm:py-8 border border-rule-strong rounded-2xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] uppercase text-faint tracking-[0.08em] leading-none mb-1.5">
              Retrospective
            </span>
            <h2 className="font-mono font-semibold text-[22px] tracking-tight leading-none">
              Weekly Review
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center w-9 h-9 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            ✕
          </button>
        </div>

        {/* Streak */}
        <div className="text-sm text-muted mb-4 font-mono">
          🔥 {streak}-week review streak
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 mb-6">
          <RingChart completed={completed.length} total={weekTasks.length} />
          <div>
            <div className="text-2xl font-mono font-semibold tabular-nums">
              {completed.length} of {weekTasks.length}
            </div>
            <div className="text-sm text-muted">tasks completed</div>
          </div>
        </div>

        <WeekTrendBars
          reviews={reviews}
          currentWeek={{
            week_id: weekId,
            completed_count: completed.length,
            planned_count: weekTasks.length,
          }}
        />

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
            {rolledOver.map((task) => {
              const chronic = task.rolled_over_count >= 3;
              return (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-2 py-1.5 border-b border-rule"
                >
                  <span className="text-[16px] flex-1 min-w-[10rem]">{task.title}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-mono tabular-nums ${
                      chronic
                        ? "bg-red-500/10 text-red-600"
                        : "bg-ink/[0.06] text-muted"
                    }`}
                  >
                    moved {task.rolled_over_count}x
                  </span>
                  {chronic && (
                    <span className="font-mono text-[11px] uppercase text-red-600/80">
                      Still relevant?
                    </span>
                  )}
                  <button
                    onClick={() =>
                      moveTask(task.id, formatDate(weekDays[0]), task.order)
                    }
                    className="text-[11px] font-mono uppercase text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    Next wk
                  </button>
                  <button
                    onClick={() => moveTask(task.id, null, task.order)}
                    className="text-[11px] font-mono uppercase text-muted hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    Backlog
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-[11px] font-mono uppercase text-muted hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/10 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
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
            name="reflection"
            aria-label="Weekly reflection"
            className="w-full bg-transparent border-b border-rule-strong outline-none py-2.5 text-[17px] placeholder:text-faint focus-visible:outline-none focus-visible:bg-ink/[0.03] transition-colors"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3.5 bg-ink text-bg rounded-md font-mono text-[14px] uppercase hover:opacity-80 active:scale-[0.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Done
        </button>
      </div>
    </div>
  );
}
