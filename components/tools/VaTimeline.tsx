"use client";

import { useMemo, useState } from "react";
import { FieldGrid, PlainField, Result, ToolFrame, num } from "./fields";

/**
 * Works a purchase backward from a date the buyer does not control.
 *
 * The stage lengths are inputs and start empty, on purpose. "A VA loan closes in
 * thirty five days" is a market claim with no source, and a schedule built on an
 * invented duration is worse than no schedule when somebody has orders. So the
 * tool does the date arithmetic and the buyer supplies the durations, from their
 * lender or from Alex.
 *
 * With no durations entered it still answers the one question that needs no
 * assumption at all: how many days are left.
 */

const STAGES = [
  {
    key: "settle",
    label: "Days you want in the house before your report date",
    hint: "Moving in, utilities, the drive to base at the hour you would drive it",
  },
  {
    key: "closing",
    label: "Days from accepted offer to closing",
    hint: "Ask your lender. It is the one number they can give you accurately.",
  },
  {
    key: "searching",
    label: "Days you expect to spend looking",
    hint: "Your call. Buying remotely usually needs more, not less.",
  },
] as const;

type Key = (typeof STAGES)[number]["key"];

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function minus(from: Date, days: number) {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

export function VaTimeline() {
  const [reportDate, setReportDate] = useState("");
  const [days, setDays] = useState<Record<Key, string>>({
    settle: "",
    closing: "",
    searching: "",
  });

  const calc = useMemo(() => {
    if (!reportDate) return null;
    // Parsed as local noon so a timezone offset cannot shift the date by a day.
    const report = new Date(`${reportDate}T12:00:00`);
    if (Number.isNaN(report.getTime())) return null;

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const daysLeft = Math.round((report.getTime() - today.getTime()) / 86_400_000);

    const settle = num(days.settle);
    const closing = num(days.closing);
    const searching = num(days.searching);
    const hasSchedule = closing > 0;

    const moveIn = minus(report, settle);
    const closeBy = minus(moveIn, 0);
    const offerBy = minus(closeBy, closing);
    const startBy = minus(offerBy, searching);

    return { report, daysLeft, hasSchedule, moveIn, closeBy, offerBy, startBy };
  }, [reportDate, days]);

  const set = (k: Key) => (v: string) => setDays((d) => ({ ...d, [k]: v }));

  return (
    <ToolFrame footnote="The dates come from the numbers you enter, and this page does not assume how long anything takes. Loan timelines vary by lender and by property, so get the closing figure from whoever is writing your loan. Send Alex your report date and he will build the real schedule around your lender's actual dates.">
      <div className="grid gap-5 sm:grid-cols-2">
        <PlainField
          label="Your report date"
          type="date"
          hint="The date you have to be there. Everything works backward from it."
          value={reportDate}
          onChange={setReportDate}
        />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {STAGES.map((s) => (
          <PlainField
            key={s.key}
            label={s.label}
            type="number"
            placeholder="days"
            hint={s.hint}
            value={days[s.key]}
            onChange={set(s.key)}
          />
        ))}
      </div>

      <Result
        label={calc ? "Days until your report date" : ""}
        value={calc ? String(calc.daysLeft) : ""}
        tone={calc && calc.daysLeft < 0 ? "negative" : "normal"}
        empty={
          calc
            ? undefined
            : "Put in your report date. You will get the days remaining straight away, and a working schedule once you add how long your lender says closing takes."
        }
      >
        {calc && calc.hasSchedule && (
          <>
            <p className="label mt-8 text-subtle">Working backward from that date</p>
            <ol className="mt-4 divide-y divide-line border-t border-line">
              {[
                { label: "Start looking by", date: calc.startBy },
                { label: "Under contract by", date: calc.offerBy },
                { label: "Close by", date: calc.closeBy },
                { label: "In the house by", date: calc.moveIn },
                { label: "Report date", date: calc.report },
              ].map((row) => (
                <li key={row.label} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <span className="text-[0.98rem] text-ink">{row.label}</span>
                  <span className="figure text-[0.98rem] font-semibold text-navy">
                    {fmt(row.date)}
                  </span>
                </li>
              ))}
            </ol>
            {calc.startBy.getTime() < Date.now() && (
              <p className="measure mt-5 text-[0.95rem] leading-relaxed text-subtle">
                On these numbers the search should already have started. That does not mean it
                cannot be done, it means the schedule has no slack in it and the lender
                conversation should happen today rather than this week.
              </p>
            )}
          </>
        )}
        {calc && !calc.hasSchedule && (
          <p className="measure mt-4 text-[0.95rem] leading-relaxed text-subtle">
            Add how many days your lender says closing takes and the rest of the schedule
            appears. If you do not have a lender yet, that is the first call to make.
          </p>
        )}
      </Result>
    </ToolFrame>
  );
}
