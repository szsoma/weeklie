export type Task = {
  id: string;
  title: string;
  date: string | null; // "2026-06-12", null = Backlog
  done: boolean;
  doneAt: string | null;
  color: number | null; // 0-5 palette index
  order: number;
  createdAt: string;
  rolledOverCount: number;
};

export type WeekReview = {
  weekId: string;
  completedCount: number;
  rolledOverCount: number;
  reflection: string;
  viewedAt: string;
  streak: number;
};
