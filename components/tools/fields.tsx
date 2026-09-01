"use client";

import { useId } from "react";

/**
 * Shared input primitives for the interactive tools.
 *
 * The rule every tool on this site obeys: the visitor supplies every number.
 * Nothing here ships with a market figure baked in, no interest rate, no
 * commission rate, no days on market, no appreciation assumption. That is what
 * makes these publishable for a client who has no verified figures of his own,
 * and it is why every result is arithmetic rather than a claim.
 *
 * Every field has a real label. A placeholder is not a label.
 */

export const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});


/** Strips formatting a visitor might paste in, e.g. "$1,450". */
export function num(value: string): number {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function ToolFrame({
  children,
  footnote,
}: {
  children: React.ReactNode;
  footnote: string;
}) {
  return (
    <div className="mt-8 rounded-xl border border-navy/12 bg-paper p-6 shadow-[0_18px_44px_-30px_rgba(23,42,58,0.35)] transition-shadow duration-200 hover:shadow-[0_22px_54px_-26px_rgba(23,42,58,0.45)] sm:p-7">
      {children}
      {/* Says what the tool is and is not, at the point the number appears. */}
      <p className="measure mt-6 border-t border-line pt-4 text-[0.85rem] leading-relaxed text-subtle">
        {footnote}
      </p>
    </div>
  );
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

function Shell({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label mb-2 block text-subtle">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-[0.82rem] leading-snug text-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "figure min-h-[48px] w-full bg-transparent px-2 text-[1rem] text-ink outline-none placeholder:text-subtle/60";
const wrapCls =
  "flex items-center rounded-md border border-field bg-paper focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-navy";

export function MoneyField({
  label,
  hint,
  value,
  onChange,
  placeholder = "0",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint}>
      <div className={wrapCls}>
        <span aria-hidden="true" className="figure pl-3 text-subtle">
          $
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      </div>
    </Shell>
  );
}

export function PercentField({
  label,
  hint,
  value,
  onChange,
  placeholder = "0",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint}>
      <div className={wrapCls}>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} pl-3`}
        />
        <span aria-hidden="true" className="figure pr-3 text-subtle">
          %
        </span>
      </div>
    </Shell>
  );
}

export function PlainField({
  label,
  hint,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date" | "number";
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint}>
      <div className={wrapCls}>
        <input
          id={id}
          type={type}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} pl-3`}
        />
      </div>
    </Shell>
  );
}

/** Segmented choice. Radios in real labels, so the keyboard and a screen reader both work. */
export function ChoiceRow<T extends string | number>({
  legend,
  options,
  value,
  onChange,
  format = (v) => String(v),
}: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  const name = useId();
  return (
    <fieldset className="mt-7">
      <legend className="label mb-3 text-subtle">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={String(o)}
            className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-md border px-4 text-[0.95rem] ${
              value === o
                ? "border-navy bg-navy text-cream font-semibold"
                : "border-navy/55 text-ink hover:border-navy"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={String(o)}
              checked={value === o}
              onChange={() => onChange(o)}
              className="sr-only"
            />
            {format(o)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The result block. Renders its final values immediately with no count up, so
 * the number is correct on first paint and reduced motion needs no special case.
 */
export function Result({
  label,
  value,
  tone = "normal",
  rows,
  children,
  empty,
}: {
  label: string;
  value: string;
  tone?: "normal" | "negative";
  rows?: { label: string; value: string; muted?: boolean }[];
  children?: React.ReactNode;
  empty?: string;
}) {
  return (
    <div className="mt-8 border-t border-line pt-6" aria-live="polite">
      {empty ? (
        <p className="text-[0.95rem] leading-relaxed text-subtle">{empty}</p>
      ) : (
        <>
          <p className="label text-subtle">{label}</p>
          <p
            className={`figure mt-2 text-[2.4rem] font-semibold leading-none ${
              tone === "negative" ? "text-negative" : "text-navy"
            }`}
          >
            {value}
          </p>
          {rows && rows.length > 0 && (
            <dl className="mt-6 divide-y divide-line border-t border-line">
              {rows.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className={`text-[0.95rem] ${r.muted ? "text-subtle" : "text-ink"}`}>
                    {r.label}
                  </dt>
                  <dd
                    className={`figure text-[0.98rem] ${
                      r.muted ? "text-subtle" : "font-semibold text-navy"
                    }`}
                  >
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {children}
        </>
      )}
    </div>
  );
}

/**
 * Standard amortized payment. Handles a zero rate, which otherwise divides by
 * zero and quietly renders NaN.
 */
export function monthlyPayment(principal: number, annualRatePct: number, years: number) {
  if (principal <= 0 || years <= 0) return 0;
  const i = annualRatePct / 100 / 12;
  const n = years * 12;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

/** Present value of a payment stream. The affordability calculation, inverted. */
export function loanFromPayment(payment: number, annualRatePct: number, years: number) {
  if (payment <= 0 || years <= 0) return 0;
  const i = annualRatePct / 100 / 12;
  const n = years * 12;
  if (i === 0) return payment * n;
  return (payment * (1 - Math.pow(1 + i, -n))) / i;
}
