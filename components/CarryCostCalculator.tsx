"use client";

import { useId, useMemo, useState } from "react";
import { useEasedFigure } from "./tools/fields";

/**
 * Loss aversion, stated as arithmetic rather than fear.
 *
 * Every input is a number the visitor supplies about their own house. Nothing
 * here is a market claim, a prediction, or a statistic, which is what makes it
 * publishable when the client has no verified figures of his own yet. The
 * doctrine wants the cost of waiting named. This names it without inventing it.
 */

const FIELDS = [
  { key: "mortgage", label: "Mortgage payment", hint: "Principal and interest" },
  { key: "taxes", label: "Property taxes", hint: "Monthly, or annual divided by twelve" },
  { key: "insurance", label: "Insurance", hint: "Monthly" },
  { key: "utilities", label: "Utilities you keep on", hint: "Monthly" },
] as const;

type Key = (typeof FIELDS)[number]["key"];

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function CarryCostCalculator() {
  const uid = useId();
  const [values, setValues] = useState<Record<Key, string>>({
    mortgage: "",
    taxes: "",
    insurance: "",
    utilities: "",
  });
  const [months, setMonths] = useState(3);

  const monthly = useMemo(
    () =>
      FIELDS.reduce((sum, f) => {
        const n = Number(values[f.key].replace(/[^0-9.]/g, ""));
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [values],
  );

  const total = monthly * months;
  /**
   * The total eases toward a changed value rather than snapping, using the
   * same hook the four interactive tools already share rather than a second
   * implementation of it. It skips the very first value, any non-numeric
   * value, and anything under reduced motion, all inside the hook, so the
   * figure is correct on first paint either way.
   */
  const easedTotal = useEasedFigure(usd.format(total));
  const hasInput = monthly > 0;

  /*
   * Two panels, deliberately, not one card with a line under it.
   *
   * v4 recorded that a card which is dark at the top and light at the bottom
   * "would read as two things stapled together", and that was right about the
   * assistant, where the dark part was only a header bar. It is the wrong
   * conclusion here. Inputs genuinely need a light ground and a result
   * genuinely wants a dark one, so rather than compromise both, this is two
   * panels with an explicit relationship: you fill in the left, the right
   * answers. Side by side above lg, stacked below, one border, one radius,
   * one object.
   *
   * The result figure is gold on navy. That is the second named exception to
   * "gold is a fill, never type", after the hero's one accent phrase, and it
   * is allowed for the same reason: gold as text fails on cream at 2.46:1 and
   * clears AA on every dark ground this site paints, 5.44:1 on navy and 4.68:1
   * on the brightest composite the dark field reaches. Gold as a filled
   * surface still means "act here" and still appears on exactly one control
   * per screenful. This is the one number the whole band exists to produce.
   */
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-navy/15 lg:grid lg:grid-cols-[1.15fr_1fr]">
      <div className="bg-paper p-6 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`${uid}-${f.key}`} className="label mb-2 block text-subtle">
              {f.label}
            </label>
            <div className="flex items-center rounded-md border border-field bg-paper focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy">
              <span aria-hidden="true" className="figure pl-3 text-subtle">
                $
              </span>
              <input
                id={`${uid}-${f.key}`}
                inputMode="decimal"
                autoComplete="off"
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                aria-describedby={`${uid}-${f.key}-hint`}
                placeholder="0"
                className="figure min-h-[48px] w-full rounded-md bg-transparent px-2 text-[1rem] text-ink outline-none placeholder:text-subtle/60"
              />
            </div>
            <p id={`${uid}-${f.key}-hint`} className="mt-2 text-[0.82rem] text-subtle">
              {f.hint}
            </p>
          </div>
        ))}
      </div>

      <fieldset className="mt-7">
        <legend className="label mb-3 text-subtle">How long are you thinking about it</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 3, 6, 12].map((m) => (
            <label
              key={m}
              className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-md border px-4 text-[0.95rem] ${
                months === m
                  ? "border-navy bg-navy text-cream font-semibold"
                  : "border-navy/55 text-ink hover:border-navy"
              }`}
            >
              <input
                type="radio"
                name={`${uid}-months`}
                value={m}
                checked={months === m}
                onChange={() => setMonths(m)}
                className="sr-only"
              />
              {m} {m === 1 ? "month" : "months"}
            </label>
          ))}
        </div>
      </fieldset>

      </div>

      {/* The result panel. The big figure eases toward a changed value; the
          first value a visitor ever sees, and every value under reduced
          motion, renders immediately, so first paint is always correct. */}
      <div
        className="navy-wash grain relative isolate flex flex-col justify-center p-6 text-cream sm:p-7"
        aria-live="polite"
      >
        {hasInput ? (
          <>
            <span aria-hidden="true" className="rule-gold mb-5" />
            <p className="label text-dim">
              What {months === 1 ? "that month" : `those ${months} months`} costs you
            </p>
            <p className="figure mt-3 text-[2.9rem] font-semibold leading-none text-gold sm:text-[3.4rem]">
              {easedTotal}
            </p>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-dim">
              That is <span className="figure text-cream">{usd.format(monthly)}</span> a month
              leaving your account while the house sits, whichever way you eventually decide. It is
              money spent on the house you already have, not on the next one.
            </p>
          </>
        ) : (
          <>
            <span aria-hidden="true" className="rule-gold mb-5 opacity-40" />
            <p className="text-[0.95rem] leading-relaxed text-dim">
              Put your own figures in and the total appears here. Nothing is sent anywhere and
              nothing is stored.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
