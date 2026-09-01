"use client";

import { useId, useMemo, useState } from "react";

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
  const hasInput = monthly > 0;

  return (
    <div className="mt-8 rounded-lg border border-navy/15 bg-paper p-6 sm:p-7">
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

      {/* Values render immediately with no count up animation, so the number is
          correct on first paint and reduced motion needs no special case. */}
      <div className="mt-8 border-t border-line pt-6" aria-live="polite">
        {hasInput ? (
          <>
            <p className="label text-subtle">What {months === 1 ? "that month" : `those ${months} months`} costs you</p>
            <p className="figure mt-2 text-[2.4rem] font-semibold leading-none text-navy">
              {usd.format(total)}
            </p>
            <p className="measure mt-3 text-[0.95rem] leading-relaxed text-subtle">
              That is {usd.format(monthly)} a month leaving your account while the house sits,
              whichever way you eventually decide. It is money spent on the house you already have,
              not on the next one.
            </p>
          </>
        ) : (
          <p className="text-[0.95rem] leading-relaxed text-subtle">
            Put your own figures in above and the total appears here. Nothing is sent anywhere and
            nothing is stored.
          </p>
        )}
      </div>
    </div>
  );
}
