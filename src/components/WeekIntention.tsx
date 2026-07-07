import { useState } from "react";
import { getWeekId } from "../dates";
import { useStore } from "../store";

type Props = {
  weekStart: Date;
};

export default function WeekIntention({ weekStart }: Props) {
  const reviews = useStore((s) => s.reviews);
  const saveIntention = useStore((s) => s.saveIntention);
  const weekId = getWeekId(weekStart);
  const saved = reviews.find((review) => review.week_id === weekId)?.intention ?? "";
  const [draft, setDraft] = useState({ weekId, value: saved });
  const value = draft.weekId === weekId ? draft.value : saved;
  const setValue = (nextValue: string) => setDraft({ weekId, value: nextValue });

  const persist = () => {
    const trimmed = value.trim();
    if (trimmed === saved) return;
    saveIntention({ weekStart, intention: trimmed });
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 py-3 border-b border-rule text-center">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={persist}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setDraft({ weekId, value: saved });
            e.currentTarget.blur();
          }
        }}
        placeholder="This week I want to..."
        aria-label="This week I want to"
        name="week-intention"
        className="w-full bg-transparent text-center text-[15px] italic text-muted placeholder:text-faint outline-none focus:text-ink"
      />
    </div>
  );
}
