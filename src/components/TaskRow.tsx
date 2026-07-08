import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { REMINDER_PRESET_TIMES, requestReminderPermission } from "../lib/reminders";
import { useStore } from "../store";
import type { Task } from "../types";

const COLOR_TOKENS = ["red", "orange", "yellow", "green"] as const;
const COLOR_MAP: Record<string, string> = {
  red: "#e74c3c",
  orange: "#e67e22",
  yellow: "#eab308",
  green: "#22c55e",
};

const RECURRENCE_OPTIONS = [
  { value: null, label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
] as const;

type Props = {
  task: Task;
};

function RepeatIcon({ color }: { color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function TaskRow({ task }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNote, setEditNote] = useState(task.note ?? "");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() =>
    "Notification" in window ? Notification.permission : "denied",
  );
  const settingsPopoverId = `task-settings-${task.id}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const settingsPopoverRef = useRef<HTMLDivElement>(null);
  const toggleDone = useStore((s) => s.toggleDone);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const setFocusedTask = useStore((s) => s.setFocusedTask);
  const setFocusedColumn = useStore((s) => s.setFocusedColumn);
  const moveFocusedTask = useStore((s) => s.moveFocusedTask);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    if (isEditingNote) noteInputRef.current?.focus();
  }, [isEditingNote]);

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      updateTask(task.id, { title: trimmed });
    } else {
      deleteTask(task.id);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  const handleNoteSave = () => {
    const trimmed = editNote.trim().slice(0, 300);
    if (trimmed === (task.note ?? "")) {
      setIsEditingNote(false);
      return;
    }
    updateTask(task.id, { note: trimmed ? trimmed : null });
    setIsEditingNote(false);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleNoteSave();
    if (e.key === "Escape") {
      setEditNote(task.note ?? "");
      setIsEditingNote(false);
    }
  };

  const closeSettingsPopover = useCallback(() => {
    const popover = settingsPopoverRef.current;
    if (popover?.matches(":popover-open")) {
      popover.hidePopover();
    }
  }, []);

  const selectColor = useCallback(
    (color: string) => {
      if (task.color === color) {
        updateTask(task.id, { color: null });
      } else {
        updateTask(task.id, { color });
      }
    },
    [task.color, task.id, updateTask],
  );

  const selectRecurrence = useCallback(
    (recurrence: Task["recurrence"]) => {
      updateTask(task.id, { recurrence });
    },
    [task.id, updateTask],
  );

  const selectDueTime = useCallback(
    async (dueTime: string | null) => {
      if (dueTime) {
        const permission = await requestReminderPermission();
        setNotificationPermission(permission);
      }
      updateTask(task.id, { due_time: dueTime });
    },
    [task.id, updateTask],
  );

  const handleDelete = useCallback(() => {
    deleteTask(task.id);
    closeSettingsPopover();
  }, [closeSettingsPopover, deleteTask, task.id]);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { date: task.date, order: task.order },
    });

  const rowStyle = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const hasColor = task.color !== null && task.color in COLOR_MAP;
  const colorBg = hasColor
    ? { backgroundColor: `${COLOR_MAP[task.color!]}18` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={rowStyle}
      {...listeners}
      {...attributes}
      data-task-id={task.id}
      data-task-column={task.date ?? "backlog"}
      tabIndex={0}
      onFocus={() => {
        setFocusedTask(task.id);
        setFocusedColumn(task.date ?? "backlog");
      }}
      onKeyDown={(event) => {
        if (isEditing || isEditingNote) return;
        if (event.target !== event.currentTarget) return;

        if (event.key === "Enter") {
          event.preventDefault();
          setEditTitle(task.title);
          setIsEditing(true);
        }

        if (event.key === " ") {
          event.preventDefault();
          toggleDone(task.id);
        }

        if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !task.done) {
          event.preventDefault();
          toggleDone(task.id);
        }

        if (event.key === "Backspace") {
          event.preventDefault();
          if (window.confirm("Delete this task?")) deleteTask(task.id);
        }

        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-task-id]"));
          const currentIndex = rows.findIndex((row) => row.dataset.taskId === task.id);
          const next = rows[currentIndex + (event.key === "ArrowDown" ? 1 : -1)];
          next?.focus();
        }

        if (!event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          const columns = Array.from(document.querySelectorAll<HTMLElement>("[data-column-id]"));
          const currentColumnId = task.date ?? "backlog";
          const currentIndex = columns.findIndex((column) => column.dataset.columnId === currentColumnId);
          const next = columns[currentIndex + (event.key === "ArrowRight" ? 1 : -1)];
          next?.focus();
        }

        if (event.shiftKey && event.key === "ArrowLeft") {
          event.preventDefault();
          moveFocusedTask(-1);
        }

        if (event.shiftKey && event.key === "ArrowRight") {
          event.preventDefault();
          moveFocusedTask(1);
        }
      }}
      className={`group relative grid grid-cols-[1rem_minmax(0,1fr)_auto_auto_auto] items-center m-1 gap-x-2 px-2 min-h-10 text-sm leading-snug rounded-full transition-colors ${
        isDragging
          ? "opacity-40 cursor-grabbing"
          : isEditing || isEditingNote
            ? "cursor-text"
            : "cursor-grab hover:bg-ink/[0.025]"
      }`}
    >
      {hasColor && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={colorBg}
        />
      )}

      <label className="relative flex-shrink-0 inline-flex w-4 h-4 cursor-pointer z-[1]">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => toggleDone(task.id)}
          onPointerDown={(e) => e.stopPropagation()}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-[5px] bg-ink/[0.04] transition-colors peer-checked:bg-ink" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--bg)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none relative z-10 m-auto w-3.5 h-3.5 opacity-0 peer-checked:opacity-100 transition-opacity"
        >
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      </label>

      <div className="min-w-0 z-[1] py-1">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Edit task title"
            name="task-title"
            autoComplete="off"
            className="w-full min-w-0 bg-transparent text-sm leading-snug focus:outline-none"
          />
        ) : (
          <span
            onClick={() => {
              setEditTitle(task.title);
              setIsEditing(true);
            }}
            className={`block cursor-text truncate ${
              task.done ? "line-through text-faint" : "text-ink"
            }`}
          >
            {task.title}
          </span>
        )}

        {isEditingNote ? (
          <input
            ref={noteInputRef}
            value={editNote}
            maxLength={300}
            onChange={(e) => setEditNote(e.target.value)}
            onBlur={handleNoteSave}
            onKeyDown={handleNoteKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Edit task note"
            name="task-note"
            autoComplete="off"
            className="block w-full min-w-0 bg-transparent text-[13px] leading-snug text-muted placeholder:text-faint focus:outline-none"
            placeholder="Note"
          />
        ) : task.note ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditNote(task.note ?? "");
              setIsEditingNote(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title={task.note}
            className="block w-full truncate text-left text-[13px] leading-snug text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            {task.note}
          </button>
        ) : null}
      </div>

      {task.due_time && (
        <span
          className="z-[1] inline-flex items-center gap-1 flex-shrink-0 font-mono text-[11px] text-faint"
          title={`Reminder at ${task.due_time}`}
        >
          <ClockIcon />
          {task.due_time}
        </span>
      )}

      {task.recurrence && (
        <span
          className="z-[1] flex-shrink-0 text-faint"
          title={`Repeats ${task.recurrence}`}
          aria-label={`Repeats ${task.recurrence}`}
        >
          <RepeatIcon color={hasColor ? COLOR_MAP[task.color!] : undefined} />
        </span>
      )}

      <button
        popoverTarget={settingsPopoverId}
        popoverTargetAction="toggle"
        onClick={(e) => {
          e.stopPropagation();
          setEditNote(task.note ?? "");
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Task options"
        aria-controls={settingsPopoverId}
        aria-haspopup="dialog"
        className="flex-shrink-0 w-4 h-4 grid place-items-center text-faint hover:text-ink transition-colors rounded-md z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {createPortal(
        <div
          id={settingsPopoverId}
          ref={settingsPopoverRef}
          popover="auto"
          role="dialog"
          aria-label={`Task settings for ${task.title}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="task-settings-popover"
        >
          <div className="flex items-start justify-between gap-4 border-b border-rule px-4 py-3">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-normal text-faint">
                Task settings
              </div>
              <div className="mt-1 truncate text-sm font-medium text-ink">
                {task.title}
              </div>
            </div>
            <button
              type="button"
              popoverTarget={settingsPopoverId}
              popoverTargetAction="hide"
              aria-label="Close task settings"
              className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-4 p-4">
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[10px] uppercase tracking-normal text-faint">
                  Color
                </div>
                {task.color && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTask(task.id, { color: null });
                    }}
                    className="rounded-full px-2 py-1 font-mono text-[10px] uppercase text-faint transition-colors hover:bg-ink/[0.06] hover:text-ink"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_TOKENS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectColor(color);
                    }}
                    aria-label={`Set color ${color}`}
                    className={`grid h-10 place-items-center rounded-xl border border-transparent transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 ${
                      task.color === color
                        ? "border-ink/25 bg-ink/[0.04]"
                        : ""
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full"
                      style={{ backgroundColor: COLOR_MAP[color] }}
                    />
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-normal text-faint">
                  Note
                </span>
                <input
                  type="text"
                  value={editNote}
                  maxLength={300}
                  onChange={(e) => setEditNote(e.target.value)}
                  onBlur={handleNoteSave}
                  onKeyDown={handleNoteKeyDown}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Task note"
                  name="task-settings-note"
                  autoComplete="off"
                  placeholder="Add context..."
                  className="w-full rounded-xl border border-rule bg-bg/40 px-3 py-2.5 text-xs text-muted outline-none transition-colors placeholder:text-faint hover:border-rule-strong hover:bg-ink/[0.035] focus:ring-2 focus:ring-ink/10"
                />
              </label>
            </section>

            <section className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-normal text-faint">
                Repeat
              </div>
              <div className="grid grid-cols-3 gap-2">
                {RECURRENCE_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectRecurrence(option.value);
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 ${
                      task.recurrence === option.value
                        ? "border-ink/30 bg-ink text-bg"
                        : "border-rule bg-bg/40 text-muted hover:border-rule-strong hover:bg-ink/[0.035] hover:text-ink"
                    }`}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-normal text-faint">
                Remind me
              </div>
              <div className="grid grid-cols-3 gap-2">
                {REMINDER_PRESET_TIMES.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectDueTime(time);
                    }}
                    className={`rounded-xl border px-2 py-2 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 ${
                      task.due_time === time
                        ? "border-ink/30 bg-ink text-bg"
                        : "border-rule bg-bg/40 text-muted hover:border-rule-strong hover:bg-ink/[0.035] hover:text-ink"
                    }`}
                  >
                    <span>{time}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="time"
                  value={task.due_time ?? ""}
                  onChange={(e) => selectDueTime(e.target.value || null)}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Custom reminder time"
                  className="min-w-0 rounded-xl border border-rule bg-bg/40 px-3 py-2 font-mono text-xs text-muted outline-none transition-colors hover:border-rule-strong hover:bg-ink/[0.035] focus:ring-2 focus:ring-ink/10"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectDueTime(null);
                  }}
                  className="rounded-xl border border-rule bg-bg/40 px-3 py-2 font-mono text-[10px] uppercase text-faint transition-colors hover:border-rule-strong hover:bg-ink/[0.035] hover:text-ink"
                >
                  Clear
                </button>
              </div>
              {notificationPermission === "denied" && (
                <div className="rounded-xl bg-ink/[0.035] px-3 py-2 text-[11px] leading-snug text-faint">
                  Notifications blocked. Enable them in browser settings to receive reminders.
                </div>
              )}
            </section>

            <section className="border-t border-rule pt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rule bg-bg/40 px-3 py-2.5 text-xs text-faint transition-colors hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/20"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" />
                </svg>
                Delete
              </button>
            </section>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
