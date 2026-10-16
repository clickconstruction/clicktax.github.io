# ClickTax

**This is a free tool that you should use at your own risk.**

ClickTax lets a person's AI agent fill IRS forms through an [MCP](https://modelcontextprotocol.io) server at `https://mcp.clicktax.org/mcp`, check the arithmetic, and hand back a printable PDF rendered in the person's own browser at `https://clicktax.org/fill`. Free forever. Stateless by construction.

Supported: tax years **2024** and **2025**; Form **1040**, **Schedules 1, 2, 3, A, B, C, D, E, EIC, SE, 8812**, **Schedule 1-A** (2025), Forms **8949** (capital asset sales), **8995** (QBI), **8889** (HSA), **8959** (Additional Medicare Tax), **8960** (Net Investment Income Tax), **8582** (passive activity losses), **8829** (home office), **4562** (depreciation and section 179, with a full asset schedule), **2441** (child and dependent care), **8863** (education credits), **8880** (saver's credit), **4868** (extension), **1040-ES** (estimated tax for the following year), **W-9**, **1099-NEC** (Copies 1, B, and 2), and **9325** (e-file acknowledgement, fill-only). Supporting statements (a Depreciation and Amortization Report per Form 4562 and a QBI computation statement) render as plain pages next to the forms.

Live: MCP at `https://mcp.clicktax.org/mcp` (Cloudflare Worker, free plan), renderer at `https://clicktax.org/fill` (GitHub Pages).

## How it stays free, stateless, and private

| Concern | Mechanism |
| --- | --- |
| Cloudflare Workers free tier allows 10 ms CPU per request | The Worker never touches a PDF. It validates JSON, runs the line arithmetic, and compresses a small payload. Filling the PDF (which costs 100s of ms of CPU) happens in the browser with pdf-lib. |
| No storage, no logs | The Worker has no bindings, no database, and observability disabled. Every response is `cache-control: no-store`. |
| The person's figures never sit on a server | The render link carries them in the URL **fragment** (`/fill#v1.…`), which browsers never send over the network. The renderer fetches only the blank IRS PDF. |
| Nothing to sign up for | No auth. Rate limiting is left to Cloudflare. |

## Layout

```
packages/forms   @clicktax/forms  – schemas, year parameters, line math, validation, PDF field maps, link codec
apps/mcp         Cloudflare Worker – MCP server (createMcpHandler, Streamable HTTP, stateless)
apps/web         Vite static site  – home page and the in-browser renderer (deployed to GitHub Pages)
tools            schema tooling    – dump IRS fields, draft labels, generate and verify field maps
```

### Two pieces of data per form

Every `fill_form` / `prepare_return` result returns the **form** (computed values plus the render link) and the **notes** (plain-language guidance, computations with formulas, warnings, and input issues) as separate objects, so an agent can show the person the notes without the numbers and vice versa.

## Try it without an agent

Every supported form on https://clicktax.org has a **Test** button (and there is **Test a full return**). It builds the same link an agent would receive, from invented sample figures, entirely in your browser, then renders the official PDF and lists every computed line with its formula. Because it exercises the same engine and field maps, a Test that reports "All N fields placed" is also a check that the form still matches the IRS PDF.

## MCP tools

| Tool | Purpose |
| --- | --- |
| `list_forms` | Supported forms, years, disclaimer |
| `get_form_schema` | Semantic field ids, labels, types, lines, which lines are computed |
| `get_form_notes` | What the form is for, what is computed, what to verify |
| `fill_form` | Validate + compute one form; returns form + notes + link |
| `prepare_return` | Forms 4562/8829 (one per business) → Schedule C(s) → Schedule SE → Form 8889 (one per spouse)/8959 → Schedule E → Schedules 1/2 → Schedule B → Forms 8949/Schedule D → Form 8582 → Schedule A → Form 8960 → Schedule 1-A → Form 8995 → Forms 2441/8863/8880 → Schedule 3 → Schedule EIC → Schedule 8812 → Form 1040 → Forms 4868/1040-ES, plus the supporting statements, in one call |

Prompt `prepare_return_interview`: a guided interview the agent runs before calling `prepare_return`.

Field ids are the printed line numbers (`line1`, `line27a`) plus descriptive names for header boxes (`business_name`, `filing_status`). Yes/no questions are booleans; choices are strings (`accounting_method: "cash"`); Schedule C Part V and 1040 dependents are arrays of rows.

## What the engine computes

Schedule C totals (lines 3, 5, 7, 28, 29, 31, 40, 42, 48); Schedule SE (net earnings, social security up to the wage base net of W-2 wages, Medicare, the deductible half); Schedule 1, 2, and 3 totals; Form 8995 (QBI deduction with the taxable-income limitation and loss carryforwards); Schedule 1-A for 2025 (tips, overtime, car-loan interest, and senior deductions with their phaseouts); Form 8889 (HSA limits, deduction, taxable distributions, additional taxes); Form 8959 (Additional Medicare Tax and its withholding reconciliation); Form 8829 (business-use percentage, the gross-income limit, the carryover, and the home's depreciation); Form 4562 (section 179 limits and the business-income limitation; from an asset list, every asset's current-year MACRS depreciation by the IRS table method with the half-year, mid-quarter, and mid-month conventions, the special allowance, section 280F automobile caps, and the mid-quarter test, routed to lines 6, 14, 17, 19/20, 25, and 26/27, with a Depreciation and Amortization Report); Form 8582 (the $25,000 special allowance phaseout and the allocation of allowed and unallowed losses to each Schedule E property); Form 8960 (net investment income and the 3.8% tax); Form 4868 (balance due from the return); Form 1040-ES (next year's worksheet with the 100%/110% safe harbor and four equal vouchers); Schedule A (the 7.5% medical floor, the state and local tax cap with the 2025 phase-down, and the standard-deduction comparison); Schedule B totals; Form 8949 row gains and totals by box into Schedule D, which nets short- and long-term results, applies the $3,000 loss limit, and feeds Form 1040 line 7 and the capital gain worksheet; Form 2441 (expense limits, the AGI decimal, and the dependent care benefits exclusion); Form 8863 (American opportunity and lifetime learning credits with the phaseout and the refundable 40%); Form 8880 (the saver's credit rate table); Schedule E (per-property totals, lines 23-26, the pass-through totals, line 41); the earned income credit (the EIC Table formula from the year's parameters, limited by AGI, with the investment-income and filing-status rules) from Schedule EIC; each credit limited by the tax left after the credits before it on Schedule 3; Schedule 8812 (child tax credit with the phaseout, the credit limit, and the refundable additional child tax credit including Part II-B for three or more children); Form 1040 total income, AGI, standard deduction (with age/blindness and dependent-filer limits), taxable income, the tax (IRS Tax Table reproduced exactly below $100,000, Tax Computation Worksheet above, and the Qualified Dividends and Capital Gain Tax Worksheet when line 3a or 7 is present), total tax, payments, refund or amount owed.

Not computed (the engine warns when they apply): Form 8995-A, Schedule D's 28% and section 1250 worksheets, optional SE methods, Form 8582 Part IX (losses on two or more forms), Schedule A's mortgage-debt and charitable AGI limits, and section 179 recapture. It does not e-file; Form 9325 is offered only so an ERO's acknowledgement can be filled. Form 1099-NEC Copy A is never filled: the IRS requires the scannable red form or IRIS e-filing.

## Develop

```bash
npm install
npm test                      # engine tests (vitest)
npm run typecheck
npm run verify:fieldmaps      # every mapped widget exists in the real IRS PDF
# `npm test` also fills every form for every year with pdf-lib (render smoke test)
npm run dev:web               # http://localhost:5173
npm run dev:mcp               # http://127.0.0.1:8787/mcp
```

### Adding a tax year

1. Download the IRS PDFs into `apps/web/public/forms/<year>/` (prior years live at `irs.gov/pub/irs-prior/<form>--<year>.pdf`).
2. Dump widgets and draft labels into `packages/forms/pdf/<year>/` (see `tools/`; needs `pdftotext` from poppler).
3. Add the year's parameters to `packages/forms/src/params.ts` and the year to `SUPPORTED_YEARS`.
4. `npm run gen:fieldmaps` resolves every schema rule against the new PDFs and reports misses; fix rules with per-year `names`/`tok`/`page`.
5. `npm run verify:fieldmaps` and `npm test`.

## Deploy

- Web: pushed to `main` → GitHub Actions builds `apps/web` and deploys to GitHub Pages (custom domain `clicktax.org`, DNS on Cloudflare).
- MCP: `cd apps/mcp && npx wrangler deploy` (custom domain `mcp.clicktax.org`, created by wrangler from `wrangler.jsonc`), or set the `CLOUDFLARE_API_TOKEN` repository secret and let `deploy-mcp.yml` do it.

### Abuse and limits

There is no account system. Cloudflare's free plan includes DDoS protection; a WAF rate-limiting rule on `mcp.clicktax.org` is the recommended next guardrail (configured in the Cloudflare dashboard, not in code). The Worker rejects nothing by itself: it is pure arithmetic over the request body.

## License and warranty

Source is provided as-is for the good of mankind, with no warranty of any kind. Forms are the official IRS PDFs. Nothing here is tax advice.
