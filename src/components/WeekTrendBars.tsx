import type { WeekReview } from "../types";

type TrendPoint = {
  week_id: string;
  completed_count: number;
  planned_count: number;
};

type Props = {
  reviews: WeekReview[];
  currentWeek: TrendPoint;
};

function rate(point: TrendPoint): number {
  if (point.planned_count === 0) return 0;
  return Math.round((point.completed_count / point.planned_count) * 100);
}

export default function WeekTrendBars({ reviews, currentWeek }: Props) {
  if (reviews.length === 0 && currentWeek.planned_count === 0 && currentWeek.completed_count === 0) {
    return null;
  }

  const historical = reviews
    .filter((review) => review.week_id !== currentWeek.week_id)
    .sort((a, b) => a.week_id.localeCompare(b.week_id))
    .map((review) => ({
      week_id: review.week_id,
      completed_count: review.completed_count,
      planned_count: review.planned_count,
    }));

  const points = historical.concat(currentWeek).slice(-4);

  if (points.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="font-mono text-[12px] uppercase text-faint mb-3">
        Last 4 weeks
      </h3>
      <div className="flex items-end gap-3 h-28 border-b border-rule px-1">
        {points.map((point) => {
          const value = rate(point);
          const label = point.week_id.split("-")[1] ?? point.week_id;
          return (
            <div key={point.week_id} className="flex flex-1 flex-col items-center justify-end gap-2 h-full">
              <div
                className="w-full max-w-10 rounded-t bg-ink/[0.16]"
                style={{ height: value === 0 ? "0%" : `${value}%` }}
                title={`${point.week_id}: ${value}%`}
              />
              <span className="font-mono text-[11px] text-faint">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
