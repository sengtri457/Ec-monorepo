"use client";

import { DeliveryTimelineEvent } from "@/types";

interface Props {
  events: DeliveryTimelineEvent[];
}

export default function DeliveryTimeline({ events }: Props) {
  if (!events || events.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-ink-soft">
        Fulfillment updates will appear here once the package is dispatched.
      </div>
    );
  }

  // Sort events chronologically (latest first for display or oldest first)
  const sorted = [...events].reverse();

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
      {sorted.map((ev, idx) => {
        const isLatest = idx === 0;
        const formattedDate = new Date(ev.occurred_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div key={ev.id || idx} className="relative group">
            {/* Dot Indicator */}
            <div
              className={`absolute -left-[30px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-paper transition-transform group-hover:scale-110 ${
                isLatest
                  ? "border-sky-600 bg-sky-600 text-white shadow-xs"
                  : "border-ink-soft/40 text-ink-soft"
              }`}
            >
              {isLatest ? (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              ) : (
                <span className="h-1 w-1 rounded-full bg-ink-soft/60" />
              )}
            </div>

            {/* Event Content */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <h4
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isLatest ? "text-ink" : "text-ink-soft"
                  }`}
                >
                  {ev.title}
                </h4>
                <span className="text-[10px] text-ink-soft tabular-nums shrink-0">
                  {formattedDate}
                </span>
              </div>

              {ev.description && (
                <p className="text-xs text-ink-soft leading-relaxed mt-0.5">
                  {ev.description}
                </p>
              )}

              {ev.location && (
                <div className="flex items-center gap-1 text-[10px] text-ink-soft/80 mt-1">
                  <span>📍</span>
                  <span>{ev.location}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
