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

export type WeekReview = {
  weekId: string;
  completedCount: number;
  rolledOverCount: number;
  reflection: string;
  viewedAt: string;
  streak: number;
};
