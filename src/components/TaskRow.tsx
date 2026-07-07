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

function NoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4h16v16H4z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

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
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const kebabRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const toggleDone = useStore((s) => s.toggleDone);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);

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

  const openTooltip = useCallback(() => {
    if (kebabRef.current) {
      const rect = kebabRef.current.getBoundingClientRect();
      setTooltipPos({ top: rect.bottom + 4, left: rect.right - 180 });
    }
    setTooltipOpen(true);
  }, []);

  const selectColor = useCallback(
    (color: string) => {
      if (task.color === color) {
        updateTask(task.id, { color: null });
      } else {
        updateTask(task.id, { color });
      }
      setTooltipOpen(false);
    },
    [task.color, task.id, updateTask],
  );

  const selectRecurrence = useCallback(
    (recurrence: Task["recurrence"]) => {
      updateTask(task.id, { recurrence });
      setTooltipOpen(false);
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
      setTooltipOpen(false);
    },
    [task.id, updateTask],
  );

  const handleDelete = useCallback(() => {
    deleteTask(task.id);
    setTooltipOpen(false);
  }, [deleteTask, task.id]);

  useEffect(() => {
    if (!tooltipOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        kebabRef.current &&
        !kebabRef.current.contains(e.target as Node)
      ) {
        setTooltipOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTooltipOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [tooltipOpen]);

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
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditNote("");
              setIsEditingNote(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Add task note"
            className="hidden group-hover:inline-flex text-faint hover:text-muted focus-visible:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <NoteIcon />
          </button>
        )}
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
        ref={kebabRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!tooltipOpen) openTooltip();
          else setTooltipOpen(false);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Task options"
        className="flex-shrink-0 w-4 h-4 grid place-items-center text-faint hover:text-ink transition-colors rounded-md z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {tooltipOpen &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-50 flex flex-col gap-3 p-3 min-w-[180px] rounded-xl shadow-xl"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              backgroundColor:
                "color-mix(in srgb, var(--surface) 75%, transparent)",
            }}
          >
            <div className="flex items-center justify-center gap-2">
              {COLOR_TOKENS.map((color) => (
                <button
                  key={color}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectColor(color);
                  }}
                  className={`w-4 h-4 rounded-full transition-transform hover:scale-110 ${
                    task.color === color
                      ? "ring-2 ring-white/80 ring-offset-1 ring-offset-transparent"
                      : ""
                  }`}
                  style={{ backgroundColor: COLOR_MAP[color] }}
                  aria-label={`Set color ${color}`}
                />
              ))}
            </div>

            <div className="h-px bg-rule" />
            <div className="flex flex-col gap-1">
              <div className="px-1 font-mono text-[10px] uppercase text-faint">
                Repeat
              </div>
              {RECURRENCE_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectRecurrence(option.value);
                  }}
                  className="flex items-center justify-between gap-4 rounded-md px-1 py-1 text-xs text-muted hover:bg-ink/[0.06] hover:text-ink"
                >
                  <span>{option.label}</span>
                  {task.recurrence === option.value && <span aria-hidden>Set</span>}
                </button>
              ))}
            </div>

            <div className="h-px bg-rule" />
            <div className="flex flex-col gap-1">
              <div className="px-1 font-mono text-[10px] uppercase text-faint">
                Remind me
              </div>
              {REMINDER_PRESET_TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectDueTime(time);
                  }}
                  className="flex items-center justify-between gap-4 rounded-md px-1 py-1 text-xs text-muted hover:bg-ink/[0.06] hover:text-ink"
                >
                  <span>{time}</span>
                  {task.due_time === time && <span aria-hidden>Set</span>}
                </button>
              ))}
              <input
                type="time"
                value={task.due_time ?? ""}
                onChange={(e) => selectDueTime(e.target.value || null)}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Custom reminder time"
                className="rounded-md bg-transparent px-1 py-1 text-xs text-muted outline-none hover:bg-ink/[0.06] focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  selectDueTime(null);
                }}
                className="rounded-md px-1 py-1 text-left text-xs text-faint hover:bg-ink/[0.06] hover:text-ink"
              >
                Clear
              </button>
              {notificationPermission === "denied" && (
                <div className="px-1 text-[11px] leading-snug text-faint">
                  Notifications blocked. Enable them in browser settings to receive reminders.
                </div>
              )}
            </div>

            <div className="h-px bg-rule" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="flex items-center gap-2 text-xs text-faint hover:text-red-400 transition-colors px-1 py-0.5"
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
          </div>,
          document.body,
        )}
    </div>
  );
}
