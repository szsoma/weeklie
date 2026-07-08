import { useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useStore } from "../store";

const SHORTCUTS = [
  ["Quick capture", "Cmd/Ctrl + K"],
  ["Focus backlog", "/"],
  ["Toggle today", "T"],
  ["Add task", "N"],
  ["Mark done", "Space"],
  ["Move task", "Shift + Arrow"],
  ["Close", "Esc"],
];

export default function KeyboardShortcutsDialog() {
  const open = useStore((s) => s.keyboardHelpOpen);
  const close = useStore((s) => s.closeKeyboardHelp);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] bg-ink/12 p-4 backdrop-blur-[2px]"
      onMouseDown={close}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="mx-auto mt-[14vh] w-full max-w-sm rounded-2xl border border-rule-strong bg-surface p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-mono text-[18px] font-semibold">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close keyboard shortcuts"
            className="grid h-8 w-8 place-items-center rounded-full text-faint transition hover:bg-ink/[0.06] hover:text-ink"
          >
            x
          </button>
        </div>
        <dl className="space-y-2">
          {SHORTCUTS.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-rule py-2">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="font-mono text-[12px] text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
