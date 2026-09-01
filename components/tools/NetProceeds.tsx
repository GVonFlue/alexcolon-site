"use client";

import { useMemo, useState } from "react";
import { FieldGrid, MoneyField, PercentField, Result, ToolFrame, num, usd } from "./fields";

/**
 * What a seller actually walks away with.
 *
 * The highest intent question a seller has, and the one every automated
 * valuation refuses to answer. Every input is theirs, including the commission
 * rate: that figure is negotiable and varies, so quoting one here would be both
 * a market claim we cannot source and a statement no agent should make on a
 * web page.
 */
export function NetProceeds() {
  const [price, setPrice] = useState("");
  const [payoff, setPayoff] = useState("");
  const [commission, setCommission] = useState("");
  const [closingPct, setClosingPct] = useState("");
  const [repairs, setRepairs] = useState("");

  const calc = useMemo(() => {
    const p = num(price);
    const commissionCost = (p * num(commission)) / 100;
    const closingCost = (p * num(closingPct)) / 100;
    const out = num(payoff) + commissionCost + closingCost + num(repairs);
    return { p, commissionCost, closingCost, net: p - out };
  }, [price, payoff, commission, closingPct, repairs]);

  const ready = calc.p > 0;

  return (
    <ToolFrame footnote="This is arithmetic on the figures you entered, not an appraisal, an offer, or a quote of anyone's commission. The binding number is the settlement statement your title company produces at closing. Alex can tell you which of these lines is usually negotiable on a house like yours.">
      <FieldGrid>
        <MoneyField
          label="What it sells for"
          hint="Your estimate, or the number Alex gave you"
          value={price}
          onChange={setPrice}
        />
        <MoneyField
          label="Mortgage payoff"
          hint="What you still owe, not your original loan"
          value={payoff}
          onChange={setPayoff}
        />
        <PercentField
          label="Total commission"
          hint="Whatever you have agreed. It is negotiable and this page does not assume a rate."
          value={commission}
          onChange={setCommission}
        />
        <PercentField
          label="Other closing costs"
          hint="Title, taxes owed at closing, recording. Your title company will quote this."
          value={closingPct}
          onChange={setClosingPct}
        />
        <MoneyField
          label="Repairs and concessions"
          hint="Anything you expect to give back after the inspection"
          value={repairs}
          onChange={setRepairs}
        />
      </FieldGrid>

      <Result
        label={ready ? "What you would walk away with" : ""}
        value={usd.format(calc.net)}
        tone={calc.net < 0 ? "negative" : "normal"}
        empty={ready ? undefined : "Put in a sale price and the rest fills in as you go. Nothing is sent anywhere and nothing is stored."}
        rows={
          ready
            ? [
                { label: "Sale price", value: usd.format(calc.p), muted: true },
                { label: "Mortgage payoff", value: `- ${usd.format(num(payoff))}`, muted: true },
                { label: "Commission", value: `- ${usd.format(calc.commissionCost)}`, muted: true },
                { label: "Closing costs", value: `- ${usd.format(calc.closingCost)}`, muted: true },
                { label: "Repairs and concessions", value: `- ${usd.format(num(repairs))}`, muted: true },
              ]
            : undefined
        }
      >
        {ready && calc.net < 0 && (
          <p className="measure mt-4 text-[0.95rem] leading-relaxed text-subtle">
            At these numbers the sale does not cover what is owed against the house. That is a
            solvable situation more often than people expect, and it is worth a conversation
            before you do anything else.
          </p>
        )}
      </Result>
    </ToolFrame>
  );
}
