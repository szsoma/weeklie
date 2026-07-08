import { useState } from "react";
import { useStore } from "../store";

export default function HabitAddInput() {
  const createHabit = useStore((s) => s.createHabit);
  const [title, setTitle] = useState("");

  const submit = async () => {
    const habit = await createHabit(title);
    if (habit) setTitle("");
  };

  return (
    <div className="flex h-9 items-center gap-2 rounded-full bg-ink/[0.03] px-3">
      <span className="text-faint">+</span>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => {
          if (title.trim()) submit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") setTitle("");
        }}
        placeholder="Add habit"
        aria-label="Add habit"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
      />
    </div>
  );
}
