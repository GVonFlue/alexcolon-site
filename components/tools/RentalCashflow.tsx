"use client";

import { useMemo, useState } from "react";
import {
  ChoiceRow,
  FieldGrid,
  MoneyField,
  PercentField,
  Result,
  ToolFrame,
  monthlyPayment,
  num,
  usd,
} from "./fields";

const TERMS = [15, 20, 30] as const;

/**
 * The full carry, not principal and interest.
 *
 * The two errors that account for most bad rental purchases are a rent figure
 * pulled from a national estimator and a carrying cost that stops at the loan
 * payment. This tool makes both impossible to skip: vacancy and maintenance are
 * fields, not footnotes, and the result says so plainly when the number is
 * negative rather than rounding it into looking fine.
 */
export function RentalCashflow() {
  const [price, setPrice] = useState("");
  const [downPct, setDownPct] = useState("");
  const [rate, setRate] = useState("");
  const [term, setTerm] = useState<(typeof TERMS)[number]>(30);
  const [rent, setRent] = useState("");
  const [taxes, setTaxes] = useState("");
  const [insurance, setInsurance] = useState("");
  const [vacancyPct, setVacancyPct] = useState("");
  const [maintPct, setMaintPct] = useState("");

  const calc = useMemo(() => {
    const p = num(price);
    const down = (p * num(downPct)) / 100;
    const loan = Math.max(p - down, 0);
    const pi = monthlyPayment(loan, num(rate), term);
    const r = num(rent);
    const vacancy = (r * num(vacancyPct)) / 100;
    const maintenance = (r * num(maintPct)) / 100;
    const carry = pi + num(taxes) + num(insurance) + vacancy + maintenance;
    const net = r - carry;
    // Cash on cash against the actual cash in, which is the down payment here.
    const coc = down > 0 ? ((net * 12) / down) * 100 : 0;
    return { p, down, loan, pi, vacancy, maintenance, carry, net, coc };
  }, [price, downPct, rate, term, rent, taxes, insurance, vacancyPct, maintPct]);

  const ready = calc.p > 0 && num(rent) > 0;

  return (
    <ToolFrame footnote="Arithmetic on your figures, not an analysis of a specific property. It leaves out closing costs, any work the house needs before a tenant, management fees if you are not self managing, and capital expenditure. Send Alex an address and he works all of it, including the parts this page cannot see.">
      <FieldGrid>
        <MoneyField label="Purchase price" value={price} onChange={setPrice} />
        <PercentField
          label="Down payment"
          hint="As a percentage of the price"
          value={downPct}
          onChange={setDownPct}
        />
        <PercentField
          label="Interest rate"
          hint="From a lender, not from a web page"
          value={rate}
          onChange={setRate}
        />
        <MoneyField
          label="Expected monthly rent"
          hint="What comparable places nearby are actually leasing for"
          value={rent}
          onChange={setRent}
        />
        <MoneyField label="Property taxes, monthly" value={taxes} onChange={setTaxes} />
        <MoneyField label="Insurance, monthly" value={insurance} onChange={setInsurance} />
        <PercentField
          label="Vacancy allowance"
          hint="Percent of rent you assume you will not collect"
          value={vacancyPct}
          onChange={setVacancyPct}
        />
        <PercentField
          label="Maintenance allowance"
          hint="Percent of rent set aside for repairs"
          value={maintPct}
          onChange={setMaintPct}
        />
      </FieldGrid>

      <ChoiceRow
        legend="Loan term"
        options={TERMS}
        value={term}
        onChange={setTerm}
        format={(t) => `${t} years`}
      />

      <Result
        label={ready ? "What is left every month" : ""}
        value={usd.format(calc.net)}
        tone={calc.net < 0 ? "negative" : "normal"}
        empty={
          ready
            ? undefined
            : "Put in a price and an expected rent, and the rest fills in as you go. Nothing is sent anywhere and nothing is stored."
        }
        rows={
          ready
            ? [
                { label: "Rent", value: usd.format(num(rent)), muted: true },
                { label: "Loan payment", value: `- ${usd.format(calc.pi)}`, muted: true },
                { label: "Taxes", value: `- ${usd.format(num(taxes))}`, muted: true },
                { label: "Insurance", value: `- ${usd.format(num(insurance))}`, muted: true },
                { label: "Vacancy allowance", value: `- ${usd.format(calc.vacancy)}`, muted: true },
                { label: "Maintenance allowance", value: `- ${usd.format(calc.maintenance)}`, muted: true },
                {
                  label: "Cash on cash, annual",
                  value: calc.down > 0 ? `${calc.coc.toFixed(1)}%` : "add a down payment",
                },
              ]
            : undefined
        }
      >
        {ready && calc.net < 0 && (
          <p className="measure mt-4 text-[0.95rem] leading-relaxed text-subtle">
            At these numbers the property costs you money every month it is occupied. That is
            sometimes a deliberate choice and usually is not. Worth sending the address to Alex
            before you go further.
          </p>
        )}
      </Result>
    </ToolFrame>
  );
}
