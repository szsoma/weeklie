import { useMemo, useState } from "react";
import { formatRecurrenceSummary, getHabitProgress, getWeekdayLabel, presetToRule } from "../lib/habits";
import { useStore } from "../store";
import type { RecurrencePreset, RecurrenceRule } from "../types";

const PRESETS: { value: RecurrencePreset; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom..." },
];

const FREQ_LABELS: Record<RecurrenceRule["freq"], string> = {
  daily: "days",
  weekly: "weeks",
  monthly: "months",
  yearly: "years",
};

const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;

const SETTINGS_SECTION_CLASS = "space-y-2";
const SETTINGS_LABEL_CLASS =
  "font-mono text-[10px] uppercase tracking-normal text-faint";
const SETTINGS_CHOICE_ACTIVE_CLASS = "border-ink/30 bg-ink text-bg";
const SETTINGS_CHOICE_IDLE_CLASS =
  "border-rule bg-bg/40 text-muted hover:border-rule-strong hover:bg-ink/[0.035] hover:text-ink";

function getSettingsChoiceClassName(isSelected: boolean, sizeClass: string): string {
  const stateClass = isSelected
    ? SETTINGS_CHOICE_ACTIVE_CLASS
    : SETTINGS_CHOICE_IDLE_CLASS;
  return `rounded-xl border ${sizeClass} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 ${stateClass}`;
}

function isPresetRule(
  rule: RecurrenceRule | null,
  preset: RecurrencePreset,
  baseDate: Date,
): boolean {
  if (preset === "never" && rule === null) return true;
  if (!rule) return false;
  if (preset === "custom") return false;

  const presetRule = presetToRule(preset, baseDate);
  if (!presetRule) return false;

  return (
    presetRule.freq === rule.freq &&
    presetRule.interval === rule.interval &&
    presetRule.byWeekdays.length === rule.byWeekdays.length &&
    presetRule.byWeekdays.every((d) => rule.byWeekdays.includes(d))
  );
}

type Props = {
  taskId: string;
  baseDate: Date;
  periodStart?: Date;
};

export default function HabitRepeatPopover({ taskId, baseDate, periodStart }: Props) {
  const templates = useStore((s) => s.habitTemplates);
  const tasks = useStore((s) => s.tasks);
  const instances = useStore((s) => s.habitInstances);
  const upsertHabitTemplate = useStore((s) => s.upsertHabitTemplate);
  const template = useMemo(
    () => templates.find((t) => t.task_id === taskId && t.active),
    [templates, taskId],
  );

  const [preset, setPreset] = useState<RecurrencePreset>(() => {
    if (!template) return "never";
    const found = PRESETS.find((p) => isPresetRule(template.recurrence, p.value, baseDate));
    return found?.value ?? "custom";
  });

  const [rule, setRule] = useState<RecurrenceRule | null>(() =>
    template ? template.recurrence : null,
  );

  const [target, setTarget] = useState(() => template?.target_per_period ?? 1);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handlePreset = (value: RecurrencePreset) => {
    setPreset(value);
    if (value === "never") {
      setRule(null);
      return;
    }
    if (value === "custom") {
      setRule(
        rule ?? { freq: "weekly", interval: 1, byWeekdays: [baseDate.getDay()] },
      );
      return;
    }
    setRule(presetToRule(value, baseDate));
  };

  const toggleWeekday = (day: number) => {
    if (!rule || rule.freq !== "weekly") return;
    const next = rule.byWeekdays.includes(day)
      ? rule.byWeekdays.filter((d) => d !== day)
      : [...rule.byWeekdays, day].sort((a, b) => a - b);
    setRule({ ...rule, byWeekdays: next });
  };

  const updateInterval = (interval: number) => {
    if (!rule) return;
    setRule({ ...rule, interval: Math.max(1, interval) });
  };

  const save = async () => {
    setSaveState("saving");
    try {
      await upsertHabitTemplate(taskId, rule, Math.max(1, target));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
    } catch {
      setSaveState("error");
    }
  };

  const summary = rule ? formatRecurrenceSummary(rule) : "Never";
  const progress =
    template && periodStart
      ? getHabitProgress(template, periodStart, tasks, instances)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <section className={SETTINGS_SECTION_CLASS}>
        <div className={SETTINGS_LABEL_CLASS}>Repeat</div>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePreset(option.value);
              }}
              className={getSettingsChoiceClassName(
                preset === option.value,
                "px-2 py-2 text-xs",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {rule && preset === "custom" && (
        <>
          <section className={SETTINGS_SECTION_CLASS}>
            <div className={SETTINGS_LABEL_CLASS}>Frequency</div>
            <select
              value={rule.freq}
              onChange={(e) =>
                setRule({ ...rule, freq: e.target.value as RecurrenceRule["freq"] })
              }
              className="w-full rounded-xl border border-rule bg-bg/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ink/15"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </section>

          <section className={SETTINGS_SECTION_CLASS}>
            <div className={SETTINGS_LABEL_CLASS}>Interval</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Every</span>
              <input
                type="number"
                min={1}
                value={rule.interval}
                onChange={(e) => updateInterval(parseInt(e.target.value, 10) || 1)}
                className="w-16 rounded-xl border border-rule bg-bg/40 px-3 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-ink/15"
              />
              <span className="text-sm text-muted">{FREQ_LABELS[rule.freq]}</span>
            </div>
          </section>

          {rule.freq === "weekly" && (
            <section className={SETTINGS_SECTION_CLASS}>
              <div className={SETTINGS_LABEL_CLASS}>On days</div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_INDEXES.map((day) => {
                  const active = rule.byWeekdays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWeekday(day);
                      }}
                      className={getSettingsChoiceClassName(active, "h-9 p-0 text-[11px]")}
                      title={getWeekdayLabel(day)}
                    >
                      {getWeekdayLabel(day).slice(0, 1)}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <section className={SETTINGS_SECTION_CLASS}>
        <div className={SETTINGS_LABEL_CLASS}>Target per period</div>
        <input
          type="number"
          min={1}
          value={target}
          onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-full rounded-xl border border-rule bg-bg/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ink/15"
        />
      </section>

      <div className="rounded-xl bg-ink/[0.035] px-3 py-2 text-xs text-muted">
        {summary}
        {progress ? ` — ${progress.completed}/${progress.total} done this week` : null}
      </div>

      <button
        type="button"
        disabled={saveState === "saving"}
        onClick={(e) => {
          e.stopPropagation();
          save();
        }}
        className="w-full rounded-md bg-ink px-4 py-2 font-mono text-[13px] uppercase text-bg disabled:opacity-60"
      >
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Failed" : "Save"}
      </button>
    </div>
  );
}
