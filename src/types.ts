export type Task = {
  id: string;
  title: string;
  date: string | null; // "2026-06-12", null = Backlog
  done: boolean;
  doneAt: string | null;
  color: string | null; // "red" | "orange" | "yellow" | "green" | "blue" | "purple"
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  plannedDate: string | null; // original scheduled date before rollover
  rolledOverCount: number;
  lastRolledOverAt: string | null;
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
  taskId: string;
  type: TaskEventType;
  fromDate: string | null;
  toDate: string | null;
  createdAt: string;
};

export type WeekReview = {
  weekId: string;
  completedCount: number;
  plannedCount: number;
  rolledOverCount: number;
  reflection: string;
  viewedAt: string;
  streak: number;
  completedTaskIds: string[];
  rolledOverTaskIds: string[];
  createdAt: string;
  updatedAt: string;
};
