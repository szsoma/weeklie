import { useState } from "react";
import { formatDate } from "../dates";
import { useStore } from "../store";
import type { MoodOption } from "../types";

const MOODS: MoodOption[] = ["Calm", "Focused", "Scattered", "Tired", "Stressed", "Good"];
const ENERGY_VALUES = [1, 2, 3, 4, 5];

type Props = {
  date: Date;
};

export default function DayCheckinButton({ date }: Props) {
  const dateKey = formatDate(date);
  const checkin = useStore((s) => s.dayCheckins.find((item) => item.date === dateKey));
  const upsertDayCheckin = useStore((s) => s.upsertDayCheckin);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const noteValue = noteDraft ?? checkin?.note ?? "";
  const popoverId = `day-checkin-${dateKey}`;

  const saveNote = () => {
    const trimmed = noteValue.trim().slice(0, 160);
    upsertDayCheckin(dateKey, { note: trimmed || null });
    setNoteDraft(trimmed);
  };

  return (
    <div className="relative">
      <button
        type="button"
        popoverTarget={popoverId}
        className="rounded-full px-2 py-1 font-mono text-[11px] text-faint transition hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
      >
        {checkin?.energy ? `Energy ${checkin.energy}` : "Energy"}
        {checkin?.mood ? ` · ${checkin.mood}` : ""}
      </button>
      <div id={popoverId} popover="auto" className="task-settings-popover">
        <div className="space-y-4 p-4">
          <section>
            <div className="mb-2 font-mono text-[11px] uppercase text-faint">Energy</div>
            <div className="grid grid-cols-5 gap-2">
              {ENERGY_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Set energy ${value}`}
                  onClick={() => upsertDayCheckin(dateKey, { energy: value })}
                  className={`h-9 rounded-full border ${
                    checkin?.energy === value ? "border-ink bg-ink text-bg" : "border-rule text-muted"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="mb-2 font-mono text-[11px] uppercase text-faint">Mood</div>
            <div className="grid grid-cols-2 gap-2">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => upsertDayCheckin(dateKey, { mood })}
                  className={`rounded-xl border px-3 py-2 text-xs ${
                    checkin?.mood === mood ? "border-ink bg-ink text-bg" : "border-rule text-muted"
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </section>
          <label className="block">
            <span className="mb-2 block font-mono text-[11px] uppercase text-faint">Note</span>
            <input
              value={noteValue}
              onChange={(event) => setNoteDraft(event.target.value)}
              onBlur={saveNote}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveNote();
                if (event.key === "Escape") setNoteDraft(null);
              }}
              className="w-full rounded-xl border border-rule bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ink/15"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
