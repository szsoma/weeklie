import { useRef, useEffect } from "react";
import { useStore } from "../store";
import { getWeekDays, isToday } from "../dates";
import DayColumn from "./DayColumn";
import BacklogPanel from "./BacklogPanel";

export default function WeekGrid() {
  const currentWeekStart = useStore((s) => s.currentWeekStart);
  const todayFocusActive = useStore((s) => s.todayFocusActive);
  const days = getWeekDays(currentWeekStart);
  const visibleDays = todayFocusActive
    ? days.filter((day) => isToday(day))
    : days;
  const todayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.innerWidth < 768 && todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const weekdays = days.slice(0, 5); // Mon-Fri
  const saturday = days[5];
  const sunday = days[6];

  const currentDesktopGrid = (
    <div className="hidden mx-6 md:grid flex-1 min-h-0 grid-cols-6 grid-rows-2 gap-px bg-rule">
      {weekdays.map((day) => (
        <div
          key={day.toISOString()}
          ref={isToday(day) ? todayRef : undefined}
          className="min-w-0"
        >
          <DayColumn date={day} />
        </div>
      ))}
      <div
        key={saturday.toISOString()}
        ref={isToday(saturday) ? todayRef : undefined}
        className="min-w-0"
      >
        <DayColumn date={saturday} />
      </div>

      <div className="col-start-1 col-end-6 row-start-2 min-w-0">
        <BacklogPanel />
      </div>
      <div
        key={sunday.toISOString()}
        ref={isToday(sunday) ? todayRef : undefined}
        className="col-start-6 row-start-2 min-w-0"
      >
        <DayColumn date={sunday} />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: single scrolling column of stacked days, then backlog */}
      <div className="weekgrid md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-rule pb-24">
        {visibleDays.map((day) => (
          <div
            key={day.toISOString()}
            ref={isToday(day) ? todayRef : undefined}
          >
            <DayColumn date={day} />
          </div>
        ))}
        <BacklogPanel />
      </div>

      {/*
        Desktop: a 6-column × 2-row grid.
        Row 1: Mon Tue Wed Thu Fri | Sat
        Row 2: Backlog (spans 5 cols) | Sun
        Sat sits directly above Sun — each weekend day gets a full row of height.
        gap-px + bg-rule draws hairline dividers between every cell.
      */}
      {todayFocusActive && visibleDays[0] ? (
        <div className="hidden mx-6 md:grid flex-1 min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-px bg-rule">
          <DayColumn date={visibleDays[0]} />
          <BacklogPanel />
        </div>
      ) : currentDesktopGrid}
    </>
  );
}
