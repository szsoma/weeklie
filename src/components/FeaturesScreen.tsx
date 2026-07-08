import { useEffect } from "react";

type Props = {
  onClose: () => void;
};

type FeatureGroup = {
  title: string;
  items: { name: string; desc: string }[];
};

const shortcuts: [string, string][] = [
  ["Quick capture", "Cmd/Ctrl + K"],
  ["Focus backlog", "/"],
  ["Toggle today", "T"],
  ["Add task", "N"],
  ["Mark done", "Space"],
  ["Move task", "Shift + Arrow"],
  ["Close", "Esc"],
];

const groups: FeatureGroup[] = [
  {
    title: "Planning the week",
    items: [
      {
        name: "Copy last week",
        desc: "Pull undone tasks from the previous week onto the matching weekdays (title, color, and note copied; recurrence and backlog items skipped).",
      },
      {
        name: "Recurring tasks",
        desc: "Mark a task Daily or Weekly; completing it spawns the next undone instance with the same title, color, note, and due time.",
      },
    ],
  },
  {
    title: "Day-to-day execution",
    items: [
      {
        name: "Due-time reminders",
        desc: "Set a reminder time on a task and get a browser notification with a Mark done action when it fires.",
      },
      {
        name: "Task notes",
        desc: "A short second line under any task title for context (saves on blur / Enter, discards on Escape).",
      },
      {
        name: "Backlog search",
        desc: "Filter the backlog by title as you type.",
      },
    ],
  },
  {
    title: "Weekly review",
    items: [
      {
        name: "Week-over-week trends",
        desc: "A small four-week completion chart under the ring stat.",
      },
      {
        name: "Slipped-task emphasis",
        desc: "Tasks rolled over three or more times get a warning badge and a gentle \"Still relevant?\" nudge.",
      },
    ],
  },
];

export default function FeaturesScreen({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Weekly features"
    >
      <div
        className="w-[min(36rem,calc(100vw-2rem))] max-h-[85dvh] overflow-y-auto bg-surface border border-rule-strong rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-mono font-semibold text-[20px] tracking-tight">
            Features
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close features"
            className="grid place-items-center w-8 h-8 -mr-1 rounded-full text-muted hover:text-ink hover:bg-ink/[0.06] transition"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.title}>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint mb-3">
                {group.title}
              </h3>
              <dl className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.name}>
                    <dt className="text-[14px] font-medium text-ink">
                      {item.name}
                    </dt>
                    <dd className="text-[13px] leading-relaxed text-muted mt-0.5">
                      {item.desc}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <section className="mt-6 pt-5 border-t border-rule">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint mb-3">
            Keyboard shortcuts
          </h3>
          <dl className="space-y-1">
            {shortcuts.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b border-rule py-1.5"
              >
                <dt className="text-[13px] text-muted">{label}</dt>
                <dd className="font-mono text-[12px] text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-faint">
            Shortcuts don't fire while typing. Press{" "}
            <kbd className="font-mono text-[11px] text-muted">?</kbd> anywhere
            to open this reference again.
          </p>
        </section>

        <p className="mt-3 pt-4 border-t border-rule text-[12px] leading-relaxed text-faint">
          The light-mode background was lightened toward near-white paper so task
          highlight colors read more clearly; dark mode is unchanged.
        </p>
      </div>
    </div>
  );
}
