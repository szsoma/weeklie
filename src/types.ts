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
