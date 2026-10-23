# ClickTax: working notes for Claude Code

ClickTax lets a person's AI agent fill and compute IRS forms through an MCP server (`https://mcp.clicktax.org/mcp`) and render them as PDFs in the browser (`https://clicktax.org/fill`). Read `docs/HANDOFF.md` before changing anything; read `docs/NEW-TAX-YEAR.md` when a new tax year's forms come out.

## Hard requirements (Robert Douglas, 2026-10-15; never relax these)
- Every response and page shows exactly: **This is a free tool that you should use at your own risk.**
- Cloudflare free tier only. The Worker is JSON-only (10 ms CPU): it validates, computes, and returns a link. PDFs are filled in the browser by pdf-lib.
- Stateless and private: no storage, no logging, no analytics, `cache-control: no-store`. Never add bindings, databases, or observability.
- Each form returns the filled form and its plain-language notes as separate data.
- Free forever. Tax years 2024 onward. Fill what the agent supplies and compute the arithmetic lines.
- Add forms one at a time with tests; tell Robert when a batch is merged, deployed, and live-checked.

## Commands
```bash
export PATH=/usr/local/opt/node@22/bin:$PATH   # on Robert's Mac /usr/local/bin/node is 20.0.0 and too old
npm run typecheck                                # all workspaces
npm test                                         # packages/forms vitest (662 tests as of 2026-10-21)
npm run build                                    # forms typecheck + web build
npx tsx tools/gen-fieldmaps.ts                   # regenerate PDF field maps; prints MISS/DUP for unmapped widgets
npx tsx tools/verify-fieldmaps.ts                # every mapped widget must exist in both years' PDFs
python3 tools/live-check.py                      # exercise the deployed server and site
cd apps/mcp && CI=true npx wrangler deploy       # deploy the Worker (needs `npx wrangler login` first)
```

## Conventions that cost time when forgotten
- `Calc.n()` rounds to whole dollars: read percents, rates, and decimals with `Number(values[id])`.
- `c.list()` reads the input list. After `c.out[listId] = rows`, keep using your local `rows`.
- A field marked `computed: true` that the agent supplies is ignored with a warning. For a line the agent may override, leave it uncomputed and fill it with `c.set` only when absent (Form 8846 line 4 pattern).
- `maxLen` must match the PDF comb or box limit (dates 10, EIN 9 or 10, SSN 9 or 11, TIN 11, one-letter code boxes 1) or the render test fails.
- Checkbox groups: `[0]` is Yes or the first printed option; for vertically stacked boxes the higher `y` is the first option.
- `locate.names: { 2024, 2025 }` with a year missing means "skip in that year"; `name: string[]` fills several copies of a widget; list columns use `listLocate[year][item]` (yes/no items as `item.yes` and `item.no`).
- Read-only (`_RO`) and 1-pt-wide widgets are harmless to map or to leave unmapped. The IRS has typos (`f3_444` on Form 6765, `Lin11g` on Form 4136) and renames widgets between years; `python3 tools/pair-years.py <form>` pairs the two years by position.
- The IRS Form 1040 header/filing-status conventions live in `packages/forms/src/forms/form1040.ts`; `filing_status` is an internal key read with `c.str` and need not be declared on other forms.
