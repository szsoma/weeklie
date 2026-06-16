import { useState, useRef } from "react";
import { useStore } from "../store";

type Props = {
  date: string | null; // null = Backlog
};

export default function NewTaskLine({ date }: Props) {
  const [title, setTitle] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addTask = useStore((s) => s.addTask);

  const handleSave = () => {
    const trimmed = title.trim();
    if (trimmed) {
      addTask(trimmed, date);
      setTitle("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setTitle("");
      inputRef.current?.blur();
    }
  };

  return (
    <div
      className={`flex items-center gap-2 px-2 py-2 mt-0.5 rounded border-b border-rule transition-colors ${
        isFocused ? "bg-ink/[0.03]" : "hover:bg-ink/[0.025]"
      }`}
    >
      <div className="w-5 h-5 rounded-[7px] flex-shrink-0 border border-dashed border-rule-strong/70" />
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          if (title.trim()) handleSave();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Add task…"
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Add task title"
        name="new-task-title"
        autoComplete="off"
        className="flex-1 min-w-0 bg-transparent outline-none text-sm leading-snug text-ink placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      />
      {/* Reserve kebab slot so input ends where task titles do */}
      <div className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
    </div>
  );
}
