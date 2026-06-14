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
      className={`flex items-start gap-3.5 py-3.5 pr-1.5 mt-0.5 rounded transition-colors ${
        isFocused ? "bg-ink/[0.025]" : "hover:bg-ink/[0.025]"
      }`}
    >
      <div className="w-[18px] h-[18px] mt-[3px] rounded-full flex-shrink-0 border-b border-dashed border-rule-strong/70" />
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
        className="flex-1 bg-transparent outline-none text-lg leading-snug text-ink placeholder:text-faint"
      />
      {/* Reserve the checkbox + delete slots so this input ends where task titles do */}
      <div className="w-6 h-6 mt-[1px] flex-shrink-0" aria-hidden="true" />
      <div className="w-6 h-6 mt-[1px] flex-shrink-0" aria-hidden="true" />
    </div>
  );
}
