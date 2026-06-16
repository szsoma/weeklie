import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { useStore } from "../store";
import type { Task } from "../types";

const COLOR_TOKENS = ["red", "orange", "yellow", "green"] as const;
const COLOR_MAP: Record<string, string> = {
  red: "#e74c3c",
  orange: "#e67e22",
  yellow: "#eab308",
  green: "#22c55e",
};

type Props = {
  task: Task;
};

export default function TaskRow({ task }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const kebabRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const toggleDone = useStore((s) => s.toggleDone);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

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

  const openTooltip = useCallback(() => {
    if (kebabRef.current) {
      const rect = kebabRef.current.getBoundingClientRect();
      setTooltipPos({ top: rect.bottom + 4, left: rect.right - 140 });
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

  const handleDelete = useCallback(() => {
    deleteTask(task.id);
    setTooltipOpen(false);
  }, [deleteTask, task.id]);

  // Close tooltip on outside click / Escape
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
      className={`group relative flex items-center m-1 gap-2 px-2 py-2 text-sm leading-snug border-b border-rule transition-colors ${
        hasColor ? "rounded-full" : ""
      } ${
        isDragging
          ? "opacity-40 cursor-grabbing"
          : isEditing
            ? "cursor-text bg-ink/[0.03]"
            : "cursor-grab hover:bg-ink/[0.025]"
      }`}
    >
      {/* Color background overlay */}
      {hasColor && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={colorBg}
        />
      )}

      {/* Checkbox */}
      <label className="relative flex-shrink-0 inline-flex w-5 h-5 cursor-pointer z-[1]">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => toggleDone(task.id)}
          onPointerDown={(e) => e.stopPropagation()}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-[7px] border border-rule-strong bg-bg transition-colors peer-checked:border-ink peer-checked:bg-ink" />
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

      {/* Title */}
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
          className="flex-1 min-w-0 bg-transparent border-b border-rule-strong focus:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg text-sm leading-snug py-1 z-[1]"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 cursor-text truncate z-[1] ${
            task.done ? "line-through text-faint" : "text-ink"
          }`}
        >
          {task.title}
        </span>
      )}

      {/* Kebab trigger */}
      <button
        ref={kebabRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!tooltipOpen) openTooltip();
          else setTooltipOpen(false);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Task options"
        className="flex-shrink-0 w-5 h-5 grid place-items-center text-faint hover:text-ink transition-colors rounded-md z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Glass morphism tooltip — portalled to body to avoid overflow clipping */}
      {tooltipOpen &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-50 flex flex-col gap-3 p-3 min-w-[140px] rounded-xl shadow-xl"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              backgroundColor:
                "color-mix(in srgb, var(--surface) 75%, transparent)",
              border: "1px solid var(--rule-strong)",
            }}
          >
            {/* Color dots */}
            <div className="flex items-center justify-center gap-2">
              {COLOR_TOKENS.map((color) => (
                <button
                  key={color}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectColor(color);
                  }}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                    task.color === color
                      ? "ring-2 ring-white/80 ring-offset-1 ring-offset-transparent"
                      : ""
                  }`}
                  style={{ backgroundColor: COLOR_MAP[color] }}
                  aria-label={`Set color ${color}`}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-rule" />

            {/* Delete */}
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
