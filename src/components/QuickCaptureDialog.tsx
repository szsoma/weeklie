import { useEffect, useMemo, useRef, useState } from "react";
import { getDefaultQuickCaptureDestination } from "../lib/quick-capture";
import { useStore } from "../store";
import type { QuickCaptureDestination } from "../types";

const DESTINATIONS: { value: QuickCaptureDestination; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
  { value: "backlog", label: "Backlog" },
];

const COLORS = ["red", "orange", "yellow", "green"] as const;

const COLOR_CLASS: Record<(typeof COLORS)[number], string> = {
  red: "bg-red",
  orange: "bg-orange",
  yellow: "bg-yellow",
  green: "bg-green",
};

export default function QuickCaptureDialog() {
  const open = useStore((s) => s.quickCaptureOpen);
  const closeQuickCapture = useStore((s) => s.closeQuickCapture);
  const createTaskFromQuickCapture = useStore((s) => s.createTaskFromQuickCapture);
  const currentWeekStart = useStore((s) => s.currentWeekStart);
  const todayFocusActive = useStore((s) => s.todayFocusActive);
  const backlogSearchFocused = useStore((s) => s.backlogSearchFocused);
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<QuickCaptureDestination | null>(null);
  const [note, setNote] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const defaultDestination = getDefaultQuickCaptureDestination(
    currentWeekStart,
    todayFocusActive,
    backlogSearchFocused,
  );
  const destination = selectedDestination ?? defaultDestination;
  const canSubmit = useMemo(() => title.trim().length > 0, [title]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const reset = () => {
    setTitle("");
    setSelectedDestination(null);
    setNote("");
    setDueTime("");
    setColor(null);
  };

  const close = () => {
    reset();
    closeQuickCapture();
  };

  const submit = async () => {
    if (!canSubmit) return;
    const task = await createTaskFromQuickCapture({
      title,
      destination,
      note,
      due_time: dueTime || null,
      color,
    });
    if (task) reset();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-ink/12 p-4 backdrop-blur-[2px]"
      onMouseDown={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Capture"
        className="mx-auto mt-[10vh] w-full max-w-md rounded-2xl border border-rule-strong bg-surface p-4 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-mono text-[18px] font-semibold">Quick Capture</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close quick capture"
            className="grid h-8 w-8 place-items-center rounded-full text-faint transition hover:bg-ink/[0.06] hover:text-ink"
          >
            x
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block font-mono text-[11px] uppercase text-faint">Task</span>
          <input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) submit();
            }}
            className="w-full rounded-xl border border-rule bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ink/15"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block font-mono text-[11px] uppercase text-faint">Destination</span>
          <select
            value={destination}
            onChange={(event) => setSelectedDestination(event.target.value as QuickCaptureDestination)}
            className="w-full rounded-xl border border-rule bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ink/15"
          >
            {DESTINATIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block font-mono text-[11px] uppercase text-faint">Optional note</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-xl border border-rule bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ink/15"
          />
        </label>

        <div className="mb-4 grid grid-cols-[1fr_auto] gap-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] uppercase text-faint">Due time</span>
            <input
              type="time"
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
              className="w-full rounded-xl border border-rule bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ink/15"
            />
          </label>
          <div>
            <span className="mb-1 block font-mono text-[11px] uppercase text-faint">Color</span>
            <div className="flex gap-1">
              {COLORS.map((token) => (
                <button
                  key={token}
                  type="button"
                  aria-label={`Set color ${token}`}
                  onClick={() => setColor(color === token ? null : token)}
                  className={`h-9 w-9 rounded-full border ${COLOR_CLASS[token]} ${
                    color === token ? "border-ink" : "border-rule"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="w-full rounded-md bg-ink px-4 py-3 font-mono text-[13px] uppercase text-bg disabled:opacity-40"
        >
          Add task
        </button>
        <div className="mt-2 text-center font-mono text-[10px] uppercase text-faint">
          Cmd/Ctrl + Enter
        </div>
      </div>
    </div>
  );
}
