"use client";

import { useMemo, useState } from "react";
import {
  ChoiceRow,
  FieldGrid,
  MoneyField,
  PercentField,
  Result,
  ToolFrame,
  loanFromPayment,
  num,
  usd,
} from "./fields";

const TERMS = [15, 20, 30] as const;

/**
 * Works backward from the payment a buyer is comfortable with to the price that
 * payment supports.
 *
 * The interest rate is an input, deliberately. Publishing a rate would be a
 * market figure with a shelf life measured in days, and quoting one on an agent
 * site is somebody else's job. The field says where to get it.
 */
export function Affordability() {
  const [payment, setPayment] = useState("");
  const [escrow, setEscrow] = useState("");
  const [down, setDown] = useState("");
  const [rate, setRate] = useState("");
  const [term, setTerm] = useState<(typeof TERMS)[number]>(30);

  const calc = useMemo(() => {
    const toPrincipal = Math.max(num(payment) - num(escrow), 0);
    const loan = loanFromPayment(toPrincipal, num(rate), term);
    return { toPrincipal, loan, price: loan + num(down) };
  }, [payment, escrow, down, rate, term]);

  const ready = num(payment) > 0 && num(rate) > 0;

  return (
    <ToolFrame footnote="This is arithmetic, not a pre approval, and it does not check your credit or your income. Only a lender can tell you what you actually qualify for, and the rate above should be one a lender quoted you rather than one you found on a web page. Alex can point you at lenders who work this market if you do not have one.">
      <FieldGrid>
        <MoneyField
          label="Monthly payment you are comfortable with"
          hint="The whole housing payment, not just the loan"
          value={payment}
          onChange={setPayment}
        />
        <MoneyField
          label="Monthly taxes and insurance"
          hint="Your lender estimates this. It comes out of the payment above."
          value={escrow}
          onChange={setEscrow}
        />
        <MoneyField
          label="Down payment"
          hint="Cash you are putting in, separate from closing costs"
          value={down}
          onChange={setDown}
        />
        <PercentField
          label="Interest rate"
          hint="Use the rate a lender quoted you. This page does not assume one."
          value={rate}
          onChange={setRate}
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
        label={ready ? "Roughly the price that payment supports" : ""}
        value={usd.format(calc.price)}
        empty={
          ready
            ? undefined
            : "Put in a monthly payment and a rate from your lender, and the price appears here. Nothing is sent anywhere and nothing is stored."
        }
        rows={
          ready
            ? [
                { label: "Toward the loan each month", value: usd.format(calc.toPrincipal), muted: true },
                { label: "Loan that supports", value: usd.format(calc.loan), muted: true },
                { label: "Your down payment", value: `+ ${usd.format(num(down))}`, muted: true },
              ]
            : undefined
        }
      >
        {ready && calc.toPrincipal === 0 && (
          <p className="measure mt-4 text-[0.95rem] leading-relaxed text-subtle">
            Taxes and insurance are using the whole payment, so there is nothing left for the
            loan itself. Check that the escrow figure is monthly rather than annual.
          </p>
        )}
      </Result>
    </ToolFrame>
  );
}
