#!/usr/bin/env python3
"""Builds packages/forms/src/forms/form4136.rows.ts from the Form 4136 PDF drafts of both years.

Each credit row (1a, 1b, ...) gets its per-year widget names for the type-of-use box, the gallons box, the
amount-of-credit dollars/cents boxes (present only on the last row of a same-rate brace group), the 2025
actual-fuel-cost boxes, and the preprinted rate parsed from the row text. Run from the repo root."""
import json, re

YEARS = ("2024", "2025")
LABELS = {
  "1a": "Off-highway business use (type of use 2)", "1b": "Use on a farm for farming purposes (type of use 1)", "1c": "Other nontaxable use (see the Caution above line 1)", "1d": "Exported (type of use 3)",
  "2a": "Use in commercial aviation (other than foreign trade)", "2b": "Other nontaxable use (see the Caution above line 1)", "2c": "Exported (type of use 3)", "2d": "LUST tax on aviation fuels used in foreign trade (type of use 9)",
  "3a": "Nontaxable use", "3b": "Use on a farm for farming purposes (type of use 1)", "3c": "Use in trains", "3d": "Use in certain intercity and local buses (see the Caution above line 1)", "3e": "Exported (type of use 3)",
  "4a": "Nontaxable use taxed at $.244", "4b": "Use on a farm for farming purposes (type of use 1)", "4c": "Use in certain intercity and local buses (see the Caution above line 1)", "4d": "Exported (type of use 3)", "4e": "Nontaxable use taxed at $.044", "4f": "Nontaxable use taxed at $.219",
  "5a": "Kerosene used in commercial aviation (other than foreign trade) taxed at $.244", "5b": "Kerosene used in commercial aviation (other than foreign trade) taxed at $.219", "5c": "Nontaxable use (other than use by state or local government) taxed at $.244", "5d": "Nontaxable use (other than use by state or local government) taxed at $.219", "5e": "LUST tax on aviation fuels used in foreign trade (type of use 9)",
  "6a": "Use by a state or local government", "6b": "Use in certain intercity and local buses",
  "7a": "Use by a state or local government", "7b": "Sales from a blocked pump", "7c": "Use in certain intercity and local buses",
  "8a": "Use in commercial aviation (other than foreign trade) taxed at $.219", "8b": "Use in commercial aviation (other than foreign trade) taxed at $.244", "8c": "Nonexempt use in noncommercial aviation", "8d": "Other nontaxable uses taxed at $.244", "8e": "Other nontaxable uses taxed at $.219", "8f": "LUST tax on aviation fuels used in foreign trade (type of use 9)",
  "10a": "Biodiesel (other than agri-biodiesel) mixtures", "10b": "Agri-biodiesel mixtures", "10c": "Renewable diesel mixtures", "10d": "Sustainable aviation fuel mixtures (rate from the instructions: $1.25 plus any supplementary amount)",
  "11a": "Liquefied petroleum gas (LPG)", "11b": "\"P Series\" fuels", "11c": "Compressed natural gas (CNG)", "11d": "Liquefied hydrogen", "11e": "Fischer-Tropsch process liquid fuel from coal (including peat)", "11f": "Liquid fuel derived from biomass", "11g": "Liquefied natural gas (LNG)", "11h": "Liquefied gas derived from biomass",
  "12a": "Liquefied petroleum gas (LPG)", "12b": "\"P Series\" fuels", "12c": "Compressed natural gas (CNG)", "12e": "Fischer-Tropsch process liquid fuel from coal (including peat)", "12f": "Liquid fuel derived from biomass", "12g": "Liquefied natural gas (LNG)", "12h": "Liquefied gas derived from biomass", "12i": "Compressed gas derived from biomass",
  "13a": "Diesel fuel sold for the exclusive use of a state or local government", "13b": "Kerosene sold for the exclusive use of a state or local government", "13c": "Kerosene for use in aviation sold for the exclusive use of a state or local government taxed at $.219",
  "14a": "Nontaxable use", "14b": "Exported (type of use 3)", "15a": "Blender credit",
  "16a": "Exported dyed diesel fuel and exported gasoline blendstocks taxed at $.001", "16b": "Exported dyed kerosene",
}
TITLES = {
  "1": "Nontaxable Use of Gasoline", "2": "Nontaxable Use of Aviation Gasoline", "3": "Nontaxable Use of Undyed Diesel Fuel", "4": "Nontaxable Use of Undyed Kerosene (Other Than Kerosene Used in Aviation)",
  "5": "Kerosene Used in Aviation", "6": "Sales by Registered Ultimate Vendors of Undyed Diesel Fuel", "7": "Sales by Registered Ultimate Vendors of Undyed Kerosene (Other Than Kerosene for Use in Aviation)",
  "8": "Sales by Registered Ultimate Vendors of Kerosene for Use in Aviation", "10": "Biodiesel, Renewable Diesel, or Sustainable Aviation Fuel Mixture Credit (2024 only)", "11": "Nontaxable Use of Alternative Fuel",
  "12": "Alternative Fuel Credit (2024 only)", "13": "Registered Credit Card Issuers", "14": "Nontaxable Use of a Diesel-Water Fuel Emulsion", "15": "Diesel-Water Fuel Emulsion Blending", "16": "Exported Dyed Fuels and Gasoline Blendstocks",
}
ROW_RE = re.compile(r"Table_Line(\d+)\[0\]\.(?:Line?(\d+)([a-z])|(Blender))\[0\]")
RATE_RE = re.compile(r"\$?\s?(\d?\.\d{2,3})(?!\d)")

rows = {}  # key -> {year -> {...}}
order = []
for year in YEARS:
    d = json.load(open(f"packages/forms/pdf/{year}/f4136.draft.json"))
    for it in d:
        name = it["pdfField"].replace("topmostSubform[0].", "")
        m = ROW_RE.search(name)
        if not m or it["type"] != "text" or it["w"] <= 2: continue
        line = m.group(1)
        key = f"{line}{m.group(3)}" if m.group(3) else f"{line}a"
        if "Reserved" in it["rowText"]: continue
        r = rows.setdefault(key, {})
        y = r.setdefault(year, {"line": line})
        if key not in order: order.append(key)
        x, w = it["x"], it["w"]
        if "ColD" in name: y["costD" if w > 30 else "costC"] = name
        elif "ColE" in name or "dAmount" in name: y["amtD" if w > 30 else "amtC"] = name
        elif year == "2025" and x < 300 and w < 40: y["use"] = name
        elif year == "2024" and 255 < x < 265: y["use"] = name
        elif year == "2024" and 330 < x < 335: y["rateBox"] = name
        elif 320 < x < 380 and w > 50:
            y["gallons"] = name
            rates = RATE_RE.findall(it["rowText"])
            if rates: y["rate"] = float(rates[-1])
        elif year == "2024" and x > 535 and w < 40: y["crn"] = name
        else: raise SystemExit(f"unclassified {year} {name} x{x} w{w}")

def sort_key(k):
    m = re.match(r"(\d+)([a-z])", k); return (int(m.group(1)), m.group(2))
order.sort(key=sort_key)
out = ["// Generated by tools/gen-4136-rows.py from the Form 4136 PDF drafts; do not edit by hand.",
       'import type { TaxYear } from "../types.ts";', "",
       "export interface FuelRowYear { use?: string; gallons: string; rate?: number; rateBox?: string; amtD?: string; amtC?: string; costD?: string; costC?: string; crn?: string }",
       "export interface FuelRow { key: string; line: string; label: string; title: string; years: TaxYear[]; byYear: Partial<Record<TaxYear, FuelRowYear>> }", "",
       "export const FUEL_ROWS: FuelRow[] = ["]
for key in order:
    r = rows[key]; line = next(iter(r.values()))["line"]
    years = [y for y in YEARS if y in r]
    by = []
    for y in years:
        v = r[y]; parts = []
        for k in ("use", "gallons", "rate", "rateBox", "amtD", "amtC", "costD", "costC", "crn"):
            if k in v: parts.append(f"{k}: {json.dumps(v[k]) if k != 'rate' else v[k]}")
        by.append(f"{y}: {{ {', '.join(parts)} }}")
    out.append(f'  {{ key: "{key}", line: "{line}", label: {json.dumps(LABELS[key])}, title: {json.dumps(TITLES[line])}, years: [{", ".join(years)}], byYear: {{ {", ".join(by)} }} }},')
out.append("];\n")
open("packages/forms/src/forms/form4136.rows.ts", "w").write("\n".join(out))
for key in order:
    r = rows[key]
    print(key, {y: (("U" if "use" in v else "-") + ("G" if "gallons" in v else "-") + ("A" if "amtD" in v else "-") + ("C" if "costD" in v else "-") + ("R" if "rateBox" in v else "-") + ("N" if "crn" in v else "-"), v.get("rate")) for y, v in r.items()})
