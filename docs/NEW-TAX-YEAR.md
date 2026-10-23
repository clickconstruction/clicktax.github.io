# Adding a tax year (runbook for 2026 forms, early 2027)

Start when the IRS posts the 2026 Form 1040 and instructions (usually December to February). Work in the order below; each step has a check.

## 0. Baseline
- `npm run typecheck && npm test && npm run build` on `main` must pass before you change anything.
- Run `python3 tools/live-check.py` and note the live form count.
- If a golden return exists under `packages/forms/test/`, it is the first test you will re-run at the end.

## 1. Parameters (`packages/forms/src/params.ts`, `src/tax.ts`, `src/types.ts`)
- Add `2026` to `export type TaxYear` in `src/types.ts`. Typecheck will then list every `Record<TaxYear, ...>` and `Partial<Record<TaxYear, ...>>` that needs a 2026 entry.
- Add a `2026` block to `PARAMS` with the inflation-adjusted figures from Rev. Proc. 2025-32 and the 2026 instructions: brackets for all five filing statuses, standard deduction and the additional amounts, dependent standard deduction, the Tax Table maximum, SE wage base and threshold, capital gain breakpoints, AMT exemption and phaseout and breakpoint, section 179 limits, HSA limits, Additional Medicare thresholds, QBI thresholds, child tax credit figures, and `formRevision: "2026"`.
- Law changes already enacted for 2026 by P.L. 119-21 (confirm each against the 2026 instructions): the QBI phase-in range widens to $75,000 ($150,000 joint) and a $400 minimum deduction applies (`PHASE_IN_RANGE` in `src/forms/form8995a.ts` becomes per-year); the senior deduction, tips, overtime, and car-loan-interest deductions on Schedule 1-A continue through 2028; the SALT cap rises 1% a year from $40,000; the child tax credit is indexed from $2,200; GILTI becomes "net CFC tested income" without the QBAI reduction (Form 8992 changes); the clean-fuel and energy credits keep shrinking (Forms 4136, 3468, 5695, 8911, 8936 change or lose lines).
- Check: `npm run typecheck` passes; `packages/forms/test/tax.test.ts` gets a 2026 case built from the official Tax Table (take two or three rows from the instructions).

## 2. PDFs
- Fetch the 2026 forms into `apps/web/public/forms/2026/`: `npx tsx tools/fetch-forms.mjs 2026` downloads every registered form from `irs-pdf` (the current-year URL). Forms the IRS has not yet posted will fail; fetch those later or by hand with `curl -A Mozilla/5.0`.
- Leave the committed 2024 and 2025 PDFs alone; they are the files the site serves. Do not re-fetch them.
- Schedules with a fixed revision date (no year in the title, for example Schedules B, C, D of Form 8995-A) are copied from the latest folder.
- Check: `ls apps/web/public/forms/2026 | wc -l` equals the registered form count.

## 3. Widgets
- `npx tsx tools/dump-fields.mjs 2026` and `npx tsx tools/draft-labels.mjs 2026` for every form.
- For each form run `python3 tools/layout.py <id> 2026 2025`. The last line says whether the widget names match 2025. Where they differ, `python3 tools/pair-years.py <id>` pairs them by position; check the pairs against the row text (the IRS shifts rows, zero-pads names, and inserts lines).
- Update each `FormDef`: add `2026` to `years`, add `2026` entries to every `locate.names` and `listLocate`, and handle new, moved, or removed lines (a removed line gets `years: [2024, 2025]`; a new line gets `years: [2026]`).
- `npx tsx tools/gen-fieldmaps.ts` until there is no MISS or DUP, then `npx tsx tools/verify-fieldmaps.ts`.
- Check: the verifier reports every form for 2026 and "All field maps verified".

## 4. Computations
- Walk `src/engine/return.ts` for every `year === 2025` or `year === 2024` branch and decide what 2026 does.
- Walk each form's `compute` for hard-coded amounts (search for `2025` and for dollar figures in `LIMITS`-style tables: Forms 2555, 8615, 8801, 8814, 8839, 8846, 8853, 461, 8396, 8936, Schedule H, Schedule EIC, Schedule 8812) and add the 2026 values from the instructions.
- Check: `npm test` passes after extending the per-year test loops (`[2024, 2025] as const` appears in many test files; add 2026) and the samples still map in all three years.

## 5. Site, server, docs
- `apps/web`: the year choices on the Test buttons and the fill page come from the forms' `years`; confirm the home page lists 2026 and that `npm run build` passes.
- `apps/mcp/src/index.ts`: update the year text in the tool descriptions and the prepare_return example.
- README: "Supported: tax years 2024, 2025, and 2026" and any new or removed forms. Update `docs/HANDOFF.md` inventory numbers.

## 6. Ship
- Branch, pull request, CI, squash-merge, `git pull`, then `cd apps/mcp && CI=true npx wrangler deploy` (after `npx wrangler login` if the token expired).
- Wait a minute, run `python3 tools/live-check.py`, and open a 2026 form from the site's Test buttons.
- Re-run the golden return for 2025 to prove nothing moved, then run Robert's 2026 figures.

## When the IRS re-posts a form mid-season
The IRS silently replaces PDFs. If a form stops filling, re-fetch that one PDF into a scratch folder, dump and draft it there, and compare names with `tools/pair-years.py` logic; only then replace the committed PDF and update the `FormDef`.
