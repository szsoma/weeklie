export type TaskRecurrence = 'daily' | 'weekly';

export type Task = {
  id: string;
  title: string;
  date: string | null; // "2026-06-12", null = Backlog
  done: boolean;
  done_at: string | null;
  color: string | null; // "red" | "orange" | "yellow" | "green" | "blue" | "purple"
  recurrence: TaskRecurrence | null;
  note: string | null;
  due_time: string | null;
  order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  planned_date: string | null; // original scheduled date before rollover
  rolled_over_count: number;
  last_rolled_over_at: string | null; // date-only string "2026-06-14"
};

export type TaskEventType =
  | 'created'
  | 'updated'
  | 'completed'
  | 'reopened'
  | 'moved'
  | 'rolled-over'
  | 'deleted';

export type TaskEvent = {
  id: string;
  task_id: string;
  type: TaskEventType;
  from_date: string | null;
  to_date: string | null;
  created_at: string;
};

export type WeekReview = {
  week_id: string;
  completed_count: number;
  planned_count: number;
  rolled_over_count: number;
  reflection: string;
  intention: string | null;
  viewed_at: string;
  streak: number;
  completed_task_ids: string[];
  rolled_over_task_ids: string[];
  created_at: string;
  updated_at: string;
};

export type WeekShare = {
  id: string;
  week_id: string;
  week_start: string;
  token: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SharedWeekTask = Pick<
  Task,
  'id' | 'title' | 'date' | 'done' | 'color' | 'order'
>;

export type SharedWeekAvailable = {
  ok: true;
  week_id: string;
  week_start: string;
  tasks: SharedWeekTask[];
};

export type SharedWeekUnavailable = {
  ok: false;
  reason: 'unavailable';
};

export type SharedWeekResponse = SharedWeekAvailable | SharedWeekUnavailable;

export type MoodOption =
  | 'Calm'
  | 'Focused'
  | 'Scattered'
  | 'Tired'
  | 'Stressed'
  | 'Good';

export type DayCheckin = {
  id: string;
  user_id: string;
  date: string;
  energy: number | null;
  mood: MoodOption | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type QuickCaptureDestination =
  | 'today'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'
  | 'backlog';

export type FocusColumnId = string | 'backlog' | null;

export type RecurrencePreset =
  | 'never'
  | 'daily'
  | 'weekdays'
  | 'weekends'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export type RecurrenceRule = {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  byWeekdays: number[]; // 0 = Sunday, 6 = Saturday
  startDayOfMonth?: number;
  startMonth?: number;
};

export type HabitTemplate = {
  id: string;
  user_id: string;
  task_id: string;
  recurrence: RecurrenceRule;
  target_per_period: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitInstance = {
  id: string;
  habit_template_id: string;
  user_id: string;
  task_id: string;
  for_date: string;
  period_start: string;
  created_at: string;
};
