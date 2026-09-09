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
  monthlyPayment,
  num,
  usd,
} from "./fields";

/* ============================================================================
   Calculator.tsx — one system, three modes.

   Replaces four separate widgets scattered across four pages: Affordability on
   /buy, NetProceeds on /sell, RentalCashflow on /investors and VaTimeline on
   /veterans. The brief is explicit that this is "one shared system with three
   modes, not a collection of unrelated widgets", and it kills the VA one
   outright: "Do not create a separate VA calculator."

   WHAT IS ACTUALLY NEW HERE, as opposed to moved:

     the forward direction on Home Price & Payment (price -> payment). The old
       Affordability only ran backward, and the brief wants both with the
       reverse as the default.
     estimated cash to close, with earnest money treated as a CREDIT
     a price RANGE rather than a single figure
     cash-flow break-even, including the case where it never arrives
     tooltips on the investor metrics

   THREE RULES FROM THE BRIEF THAT SHAPED EVERY MODE:

   1. NO LEAD GATE. Results appear as you type. The handoff is offered after
      the answer, never before it.
   2. NO FAKE PRECISION. Where the inputs cannot support a single number, the
      output is a range and says so. A four-figure affordability number built
      on an estimated tax figure is a guess wearing a suit.
   3. NEVER NaN, Infinity OR undefined. Every mode has an explicit not-ready
      state and every division guards its denominator. The QA section lists
      these as test cases; they are handled at the source instead.
   ============================================================================ */

type Mode = "payment" | "proceeds" | "rental";

const MODE_KEYS = ["payment", "proceeds", "rental"] as const;
const MODE_LABELS: Record<Mode, string> = {
  payment: "Home price & payment",
  proceeds: "Seller net proceeds",
  rental: "Long-term rental",
};

const TERMS = [30, 20, 15] as const;

/** Shared by every mode: a figure is only shown once its inputs can support it. */
const ready = (...vals: number[]) => vals.every((v) => v > 0);

/* ------------------------------------------------------------------ mode 1 */

function PaymentMode() {
  /*
   * Two directions, one interface. The brief's preferred default is the
   * reverse one — a buyer knows what they can pay per month far more often
   * than they know what house that buys.
   */
  const [dir, setDir] = useState<"toPrice" | "toPayment">("toPrice");

  const [target, setTarget] = useState("");
  const [price, setPrice] = useState("");
  const [down, setDown] = useState("");
  const [rate, setRate] = useState("");
  const [term, setTerm] = useState<(typeof TERMS)[number]>(30);
  const [taxes, setTaxes] = useState("");
  const [ins, setIns] = useState("");
  const [hoa, setHoa] = useState("");
  const [earnest, setEarnest] = useState("");

  const calc = useMemo(() => {
    const escrow = num(taxes) + num(ins) + num(hoa);
    const r = num(rate);

    if (dir === "toPrice") {
      const toPrincipal = num(target) - escrow;
      /*
       * The validation case the QA section names first: a target payment
       * smaller than the taxes and insurance alone. Without this the loan
       * solves negative and the price comes out below the down payment, which
       * renders as a confidently wrong small number rather than as an error.
       */
      if (num(target) > 0 && toPrincipal <= 0) {
        return { kind: "under" as const, escrow };
      }
      if (!ready(num(target), r)) return { kind: "idle" as const };

      const loan = loanFromPayment(toPrincipal, r, term);
      const mid = loan + num(down);
      /*
       * A RANGE, not a number. Taxes and insurance are estimates until a
       * specific property exists, and they move the answer more than anything
       * else on this form. Plus or minus 6 percent is wide enough to be honest
       * and tight enough to be useful; it is one constant so it can be tuned
       * in one place rather than hidden in the arithmetic.
       */
      const spread = 0.06;
      return {
        kind: "range" as const,
        low: mid * (1 - spread),
        high: mid * (1 + spread),
        mid,
        toPrincipal,
        escrow,
        payment: num(target),
        down: num(down),
      };
    }

    if (!ready(num(price), r)) return { kind: "idle" as const };
    const loan = Math.max(num(price) - num(down), 0);
    const pi = monthlyPayment(loan, r, term);
    return {
      kind: "payment" as const,
      pi,
      escrow,
      payment: pi + escrow,
      mid: num(price),
      down: num(down),
    };
  }, [dir, target, price, down, rate, term, taxes, ins, hoa]);

  /*
   * Estimated cash to close.
   *
   * EARNEST MONEY IS A CREDIT, NOT A COST. It is money the buyer already put
   * in, applied at the table. Stacking it on top of the down payment and
   * closing costs double-counts it and overstates what somebody needs by
   * thousands, which is the specific error the brief calls out.
   *
   * So: down payment plus estimated closing costs, MINUS earnest already paid.
   * Floored at zero, because a buyer whose earnest exceeds the rest owes
   * nothing further rather than owing a negative amount.
   */
  const cash = useMemo(() => {
    const base = "mid" in calc ? (calc.mid as number) : 0;
    if (!base) return null;
    const dp = num(down);
    const closing = base * 0.03;
    const em = num(earnest);
    return { dp, closing, em, total: Math.max(dp + closing - em, 0) };
  }, [calc, down, earnest]);

  return (
    <ToolFrame footnote="These figures are estimates for planning purposes. What you actually pay depends on the loan program, the lender, the rate you are quoted, the property's real taxes and insurance, credits and fees. Your lender and the title company produce the final numbers. This is arithmetic, not a pre-approval, and it does not look at your credit or your income.">
      <ChoiceRow
        legend="Where do you want to start?"
        value={dir}
        onChange={setDir}
        options={["toPrice", "toPayment"] as const}
        format={(v) => (v === "toPrice" ? "From a monthly payment" : "From a home price")}
      />

      <FieldGrid>
        {dir === "toPrice" ? (
          <MoneyField
            label="What monthly payment would you like to stay under?"
            hint="The whole housing payment, not just the loan"
            value={target}
            onChange={setTarget}
          />
        ) : (
          <MoneyField label="Home price" value={price} onChange={setPrice} />
        )}
        <MoneyField
          label="Down payment"
          hint="Cash you are putting in, separate from closing costs"
          value={down}
          onChange={setDown}
        />
        <PercentField
          label="Interest rate"
          hint="Use one a lender quoted you, not one from a web page"
          value={rate}
          onChange={setRate}
        />
        <MoneyField
          label="Estimated property taxes"
          hint="Monthly. Editable estimate until there is a real address."
          value={taxes}
          onChange={setTaxes}
        />
        <MoneyField
          label="Estimated homeowners insurance"
          hint="Monthly, and an estimate"
          value={ins}
          onChange={setIns}
        />
        <MoneyField label="HOA, if any" hint="Monthly" value={hoa} onChange={setHoa} />
        <MoneyField
          label="Earnest money"
          hint="Credited back to you at closing. Around 1% is a common planning figure, not a rule."
          value={earnest}
          onChange={setEarnest}
        />
      </FieldGrid>

      {calc.kind === "under" && (
        <Result
          label="That payment does not cover the taxes and insurance yet"
          value="—"
          >
            {`At ${usd.format(calc.escrow)} a month in taxes, insurance and HOA, a payment above that is needed before any of it goes toward a loan. Raise the payment, or lower the estimates if they look high for the area.`}
        </Result>
      )}

      {calc.kind === "range" && (
        <Result
          label="Roughly the home price that payment supports"
          value={`${usd.format(calc.low)} – ${usd.format(calc.high)}`}
          >
            {`A range rather than one number, because the taxes and insurance above are estimates and they move this more than anything else. Of your ${usd.format(calc.payment)}, about ${usd.format(calc.toPrincipal)} goes to the loan and ${usd.format(calc.escrow)} to taxes, insurance and HOA.`}
        </Result>
      )}

      {calc.kind === "payment" && (
        <Result
          label="Estimated monthly payment"
          value={usd.format(calc.payment)}
          >
            {`${usd.format(calc.pi)} principal and interest, plus ${usd.format(calc.escrow)} in taxes, insurance and HOA.`}
        </Result>
      )}

      {cash && calc.kind !== "idle" && calc.kind !== "under" && (
        <Result
          label="Estimated cash to close"
          value={usd.format(cash.total)}
        >
          {`${usd.format(cash.dp)} down, plus roughly ${usd.format(cash.closing)} in closing costs${cash.em > 0 ? `, less the ${usd.format(cash.em)} earnest money you already put down` : ""}. Earnest money is credited at closing, not an extra cost on top.`}
        </Result>
      )}
    </ToolFrame>
  );
}

/* ------------------------------------------------------------------ mode 2 */

function ProceedsMode() {
  const [price, setPrice] = useState("");
  const [payoff, setPayoff] = useState("");
  const [comp, setComp] = useState("");
  const [closing, setClosing] = useState("");
  const [credits, setCredits] = useState("");
  const [repairs, setRepairs] = useState("");

  const calc = useMemo(() => {
    const p = num(price);
    if (p <= 0) return null;
    /*
     * COMPENSATION IS ENTERED, NEVER DEFAULTED.
     *
     * There is no standard commission and implying one on a licensed agent's
     * website is both inaccurate and a real exposure. The field starts blank
     * and stays blank until the visitor types what their agreement says.
     */
    const compDollars = p * (num(comp) / 100);
    const out = compDollars + num(closing) + num(credits) + num(repairs) + num(payoff);
    return { p, compDollars, net: p - out };
  }, [price, payoff, comp, closing, credits, repairs]);

  return (
    <ToolFrame footnote="A planning estimate. What you actually walk away with depends on the final sale price, your exact payoff on the day, the compensation in your written agreement, closing costs, credits, prorated taxes and anything specific to the transaction.">
      <FieldGrid>
        <MoneyField label="Estimated sale price" value={price} onChange={setPrice} />
        <MoneyField
          label="Mortgage payoff"
          hint="What you still owe, from your most recent statement"
          value={payoff}
          onChange={setPayoff}
        />
        <PercentField
          label="Agent compensation"
          hint="Negotiable and set in your written agreement. There is no standard rate."
          value={comp}
          onChange={setComp}
        />
        <MoneyField
          label="Estimated seller closing costs"
          hint="Title, recording, prorated taxes"
          value={closing}
          onChange={setClosing}
        />
        <MoneyField
          label="Credits to the buyer"
          hint="If you have agreed any"
          value={credits}
          onChange={setCredits}
        />
        <MoneyField label="Repairs or other known costs" value={repairs} onChange={setRepairs} />
      </FieldGrid>

      {calc && (
        <Result
          label={calc.net >= 0 ? "Estimated proceeds" : "Estimated shortfall at closing"}
          value={usd.format(Math.abs(calc.net))}
          >
            {
            calc.net >= 0
              ? `From ${usd.format(calc.p)}, less the payoff, ${usd.format(calc.compDollars)} in compensation, and the costs above.`
              : /* The QA case: payoff larger than the proceeds. It renders as a
                   real, labelled number rather than a negative that looks like
                   a bug, because it is a real situation and a seller in it
                   needs to see it clearly. */
                `The costs and payoff come to more than the sale price. This is what would need to come to the table rather than what you would take away. Worth a conversation before listing.`
          }
        </Result>
      )}
    </ToolFrame>
  );
}

/* ------------------------------------------------------------------ mode 3 */

function RentalMode() {
  const [price, setPrice] = useState("");
  const [down, setDown] = useState("");
  const [rate, setRate] = useState("");
  const [term, setTerm] = useState<(typeof TERMS)[number]>(30);
  const [closing, setClosing] = useState("");
  const [rehab, setRehab] = useState("");
  const [rent, setRent] = useState("");
  const [taxes, setTaxes] = useState("");
  const [ins, setIns] = useState("");
  const [hoa, setHoa] = useState("");
  const [mgmt, setMgmt] = useState("8");
  const [vac, setVac] = useState("6");
  const [maint, setMaint] = useState("8");

  const calc = useMemo(() => {
    const r = num(rent);
    if (r <= 0 || num(price) <= 0) return null;

    /* NOI is before debt service, by definition. Getting that wrong is the
       most common error in a rental calculator and it flatters every deal. */
    const effective = r * (1 - num(vac) / 100);
    const opex =
      num(taxes) + num(ins) + num(hoa) + r * (num(mgmt) / 100) + r * (num(maint) / 100);
    const noiMonthly = effective - opex;

    const loan = Math.max(num(price) - num(down), 0);
    const debt = loan > 0 && num(rate) > 0 ? monthlyPayment(loan, num(rate), term) : 0;
    const cashFlow = noiMonthly - debt;

    const invested = num(down) + num(closing) + num(rehab);
    /* Guarded: a visitor who has not entered a down payment yet would
       otherwise divide by zero and see Infinity as a return. */
    const coc = invested > 0 ? ((cashFlow * 12) / invested) * 100 : null;
    const breakEvenMonths = cashFlow > 0 && invested > 0 ? invested / cashFlow : null;

    return { noiMonthly, cashFlow, invested, coc, breakEvenMonths, debt };
  }, [price, down, rate, term, closing, rehab, rent, taxes, ins, hoa, mgmt, vac, maint]);

  return (
    <ToolFrame footnote="A planning estimate for a straightforward long-term rental. It does not model appreciation, tax treatment, a refinance or a sale, and it is not an underwriting tool. Real numbers depend on the specific property, the financing you are offered and what the place actually rents for.">
      <FieldGrid>
        <MoneyField label="Purchase price" value={price} onChange={setPrice} />
        <MoneyField label="Down payment" value={down} onChange={setDown} />
        <PercentField label="Interest rate" value={rate} onChange={setRate} />
        <MoneyField label="Estimated closing costs" value={closing} onChange={setClosing} />
        <MoneyField label="Initial repairs" value={rehab} onChange={setRehab} />
        <MoneyField label="Expected monthly rent" value={rent} onChange={setRent} />
        <MoneyField label="Property taxes" hint="Monthly" value={taxes} onChange={setTaxes} />
        <MoneyField label="Insurance" hint="Monthly" value={ins} onChange={setIns} />
        <MoneyField label="HOA, if any" hint="Monthly" value={hoa} onChange={setHoa} />
        <PercentField
          label="Property management"
          hint="Of rent. Use 0 if you manage it yourself."
          value={mgmt}
          onChange={setMgmt}
        />
        <PercentField
          label="Vacancy"
          hint="Of rent. What you assume sits empty."
          value={vac}
          onChange={setVac}
        />
        <PercentField
          label="Maintenance"
          hint="Of rent, set aside for repairs"
          value={maint}
          onChange={setMaint}
        />
      </FieldGrid>

      {calc && (
        <>
          <Result
            label="Estimated monthly cash flow"
            value={usd.format(calc.cashFlow)}
            >
              {`After ${usd.format(calc.debt)} of debt service. Negative means the property costs you money each month under these assumptions, which is information rather than a verdict.`}
          </Result>
          <Result
            label="Net operating income, monthly"
            value={usd.format(calc.noiMonthly)}
            >
              Rent after vacancy, less operating expenses, BEFORE the mortgage. NOI deliberately excludes debt service, which is why it is higher than cash flow.
          </Result>
          <Result
            label="Cash-on-cash return"
            value={calc.coc === null ? "—" : `${calc.coc.toFixed(1)}%`}
            >
              {
              calc.coc === null
                ? "Add a down payment, closing costs or repairs so there is cash invested to measure the return against."
                : `Annual pre-tax cash flow against the ${usd.format(calc.invested)} you put in. Before appreciation and before any tax treatment.`
            }
          </Result>
          <Result
            label="Cash-flow break-even"
            value={
              calc.breakEvenMonths === null
                ? "Not reached"
                : `${Math.round(calc.breakEvenMonths)} months`
            }
            >
              {
              /* The QA case, handled rather than divided by zero: zero or
                 negative cash flow means break-even never arrives, and saying
                 so plainly is more useful than a number that cannot exist. */
              calc.breakEvenMonths === null
                ? "Under these assumptions the monthly cash flow is not positive, so the cash you put in is never returned by cash flow alone. That is not automatically a bad deal, but it is a different deal."
                : "Roughly how long until the cash you put in comes back as cash flow. It does not count appreciation, tax benefits, a refinance or a sale."
            }
          </Result>
        </>
      )}
    </ToolFrame>
  );
}

/* ------------------------------------------------------------------- shell */

export function Calculator({ initial = "payment" }: { initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);

  return (
    <div>
      {/*
        The mode selector. The homepage opens on the selector; Buy, Sell and
        Investors each open their own mode directly, which is what `initial`
        is for. A visitor on the sell page should not have to pick "seller"
        out of a list before the page starts being useful.
      */}
      <ChoiceRow
        legend="Run the numbers"
        value={mode}
        onChange={setMode}
        options={MODE_KEYS}
        format={(v) => MODE_LABELS[v]}
      />

      {mode === "payment" && <PaymentMode />}
      {mode === "proceeds" && <ProceedsMode />}
      {mode === "rental" && <RentalMode />}
    </div>
  );
}
