# ClickTax handoff (state as of 2026-10-23)

Written for whoever picks this up next, most likely an AI agent working with Robert Douglas. Everything needed to run, change, and redeploy the service is in this repository; nothing depends on a conversation history.

## What it is, and is not
- An MCP server at `https://mcp.clicktax.org/mcp` (Cloudflare Worker, `apps/mcp`) with five tools: `list_forms`, `get_form_schema`, `get_form_notes`, `fill_form`, `prepare_return`. The agent sends values as JSON; the Worker validates, computes every arithmetic line, and returns a link to `https://clicktax.org/fill#<payload>`.
- A static site (`apps/web`, Vite, GitHub Pages, custom domain `clicktax.org`) whose `/fill` page decodes the payload and fills the official IRS PDFs with pdf-lib in the browser. The PDFs live in `apps/web/public/forms/<year>/<id>.pdf` and are served as `/forms/<year>/<id>.pdf`.
- A forms engine (`packages/forms`): one `FormDef` per form (`src/forms/*.ts`), the registry (`src/forms/index.ts`), the id list (`src/types.ts`), per-year parameters (`src/params.ts`), tax tables (`src/tax.ts`), the return assembler (`src/engine/return.ts`), and generated field maps (`src/fieldmaps/`).
- It is not an e-file provider; output is for printing, mailing, or review. It does no state returns. Entity and employer returns (1120-S, 1065, 1041, 941) were deferred by Robert. Form 8910 is obsolete and was dropped.

## Inventory
- 87 forms, each for tax years 2024 and 2025 (the README "Supported" line lists them), including Form 1040 and 1040-SR, every Form 1040 schedule, the business, credit, and foreign forms, Form 1040-NR, and Form 8995-A with Schedules A-D.
- 662 tests in `packages/forms/test` (vitest), including a render test that fills every mapped widget of every form in both years.
- Supporting statements rendered next to the forms: a Depreciation and Amortization Report per Form 4562 and a QBI computation statement (Form 8995 or 8995-A).
- History: pull requests 1-17 (2026-10-15 to 2026-10-21), one phase or batch each. Last Worker deploy: version `0fc6dae7` on 2026-10-21.
- Known gaps: Schedule D 28% and unrecaptured section 1250 worksheets, multi-student Form 8863, Form 8582 Part IX, section 179 recapture, the 1040-NR schedules (OI, NEC, A) are entered as totals, Form 3468 percentages are supplied rather than derived from the Part I answers.

## Accounts and access
- GitHub: org `clickconstruction`, repo `clicktax.github.io`; Robert's user `realrobertdouglas` is org admin. CI (`.github/workflows/ci.yml`) runs typecheck, tests, and build on pull requests and on main.
- Cloudflare: the Worker `clicktax-mcp` with custom domain `mcp.clicktax.org` (`apps/mcp/wrangler.jsonc`). DNS for `clicktax.org` and `mcp.clicktax.org` is in the Cloudflare dashboard (DNS-only A records for Pages plus the Worker custom domain). There is no API token anywhere; deploys use the wrangler OAuth login on Robert's Mac.
- Deploys: pushing to `main` deploys the site through `.github/workflows/deploy-web.yml` (Pages, workflow build). The Worker workflow (`deploy-mcp.yml`) skips unless a `CLOUDFLARE_API_TOKEN` repository secret exists, so deploy the Worker by hand: `npx wrangler login` once, then `cd apps/mcp && CI=true npx wrangler deploy`. The new version shows at the edge within about a minute. If you want automatic Worker deploys, create a Cloudflare API token (Workers Scripts edit, Account Settings read) and add it as that secret.
- No secrets are in the repo and none are needed to run tests or build.
- Renewals to check once a year: the `clicktax.org` domain registration and the Cloudflare account.

## How a request flows
1. The agent calls `prepare_return` (or `fill_form`) with values keyed by the field ids from `get_form_schema`.
2. `prepareReturn` (`packages/forms/src/engine/return.ts`) builds the forms in dependency order: per-business Forms 4562/8829, Schedules C and F, Schedule SE, HSA and Medicare forms, Form 4797, rentals, income adjustments, Schedules 1 and 2, Schedule B, the capital-gain forms into Schedule D, Form 8606, passive losses, deductions (Schedule A or the standard deduction), QBI (Form 8995 or 8995-A), AMT, the credit forms into Form 3800 and Schedule 3, the earned income and child tax credits, Form 1040, the underpayment penalty, and the extension and estimated-tax vouchers. Each cross-form hand-off is explicit in that file (search for the form id).
3. The result is a payload: per form, the computed values, the PDF field values, computations with formulas, warnings, and notes. The link encodes the payload (deflate plus base64url) in the URL fragment, so the server never stores it.
4. The `/fill` page (`apps/web/src/fill.ts`) loads each form's PDF, fills the widgets, lays out the statements, and offers downloads.

## Adding or changing a form
1. Download the PDFs: current year from `https://www.irs.gov/pub/irs-pdf/<id>.pdf`, prior year from `https://www.irs.gov/pub/irs-prior/<id>--<year>.pdf`, into `apps/web/public/forms/<year>/`. Schedules with a fixed revision date (for example Schedules B, C, D of Form 8995-A) have no prior-year file; copy the current one into both year folders.
2. Enumerate and label the widgets: `npx tsx tools/dump-fields.mjs 2025 <id>` and `npx tsx tools/draft-labels.mjs 2025 <id>` (repeat for 2024). The optional basenames let you do this before the form is registered.
3. Inspect: `python3 tools/layout.py <id> 2025 2024` prints every widget with page, position, width, name, and the text on its row, plus the year-to-year name differences. `python3 tools/pair-years.py <id>` pairs renamed widgets by position. `pdftotext -layout` on the PDF gives the line text.
4. Write `packages/forms/src/forms/<name>.ts`: fields with `locate` rules, `years`, `computed`, `maxLen`, lists with `listLocate`, and a `compute` using the `Calc` helpers. Look at a similar existing form first (Form 5884 for a small credit, Form 8997 for row tables, Form 4136 for a generated row table, Form 1040-NR for a two-year name table).
5. Register the id in `FORM_ID_LIST` (`src/types.ts`) and the registry (`src/forms/index.ts`); add a sample to `src/samples.ts` (it drives the mapping and render tests and the site's Test buttons).
6. `npx tsx tools/gen-fieldmaps.ts` (fix every MISS and DUP), `npx tsx tools/verify-fieldmaps.ts`, `npm run typecheck`, `npm test`, `npm run build`.
7. Wire it into `prepareReturn` if it feeds another form, add the `inputSchema` entry and the mapping line in `apps/mcp/src/index.ts`, update the README "Supported" line and pipeline row, and add tests in `packages/forms/test/`.
8. Branch, commit, pull request, wait for CI, squash-merge, pull main, deploy the Worker, wait a minute, run `python3 tools/live-check.py`.

## Verifying against reality
The tests check the engine against itself and against IRS parameters. The strongest check is a real return: run last year's figures through `prepare_return` and compare line by line with what the tax software produced, then keep the anonymized input and the expected lines as a test under `packages/forms/test/` so the comparison reruns forever. Also open the Test buttons on `https://clicktax.org` for the complex forms (4136, 3468, 965-A, 1040-NR, 3800, 8995-A) and look at the filled pages; the render test proves every widget accepts its value, not that the page reads right.

## Recommended next steps (not done)
- A `LICENSE` file (MIT or Apache-2.0) so "free forever" is a grant, not an intention.
- A real landing page (`apps/web/index.html` is a placeholder) with the disclaimer and a connect-this-MCP-server walkthrough.
- A Cloudflare rate-limiting rule on `mcp.clicktax.org` (the free plan allows one) so a runaway client cannot exhaust the daily request cap.
- A monthly job that re-fetches the IRS PDFs into a scratch folder and runs the verifier against them, to catch silently re-posted forms with renamed widgets.
