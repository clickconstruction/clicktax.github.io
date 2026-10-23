#!/usr/bin/env python3
"""Exercises the deployed ClickTax service: python3 tools/live-check.py [--year 2025]

Checks that the live MCP server lists every registered form, prepares a small return, and that the site
serves the PDFs. Run from the repo root after deploying. Uses a curl-like User-Agent because Cloudflare's
browser integrity check rejects the default Python one."""
import json, re, sys, urllib.request

URL = "https://mcp.clicktax.org/mcp"
SITE = "https://clicktax.org"
year = int(sys.argv[sys.argv.index("--year") + 1]) if "--year" in sys.argv else 2025
HEADERS = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream", "User-Agent": "curl/8.4.0"}

def call(name, arguments):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": name, "arguments": arguments}}).encode()
    text = urllib.request.urlopen(urllib.request.Request(URL, data=body, headers=HEADERS), timeout=90).read().decode()
    data = next((l[5:].strip() for l in text.splitlines() if l.startswith("data:")), text)
    return json.loads(data)["result"]["content"][0]["text"]

def status(url):
    try:
        return urllib.request.urlopen(urllib.request.Request(url, method="HEAD", headers={"User-Agent": HEADERS["User-Agent"]}), timeout=30).status
    except urllib.error.HTTPError as e:
        return e.code

ids = sorted(set(re.findall(r'"(f[0-9a-z]+|fw9)"', open("packages/forms/src/types.ts").read().split("FORM_ID_LIST")[1].split("]")[0])))
listed = call("list_forms", {})
disclaimer = "This is a free tool that you should use at your own risk."
missing = [i for i in ids if f"`{i}`" not in listed]
print(f"registered forms: {len(ids)}; listed live: {len(ids) - len(missing)}; missing: {missing or 'none'}")
print("disclaimer in list_forms:", disclaimer in listed)

ret = call("prepare_return", {"year": year, "form1040": {"first_name": "Sam", "last_name": "Sample", "ssn": "123456789", "filing_status": "single", "digital_assets": False, "line1a": 50000, "line25a": 6000},
                              "scheduleC": [{"principal_business": "Consulting", "accounting_method": "cash", "material_participation": True, "line1": 80000, "line18": 1200}]})
print("disclaimer in prepare_return:", disclaimer in ret)
m = re.search(r"render and download all (\d+) forms", ret)
print("prepare_return forms rendered:", m.group(1) if m else "not found")
print("fill link present:", f"{SITE}/fill#" in ret)

sample = ["f1040", "f1040sc", "f1040sse", "f8995", "f8995a", "f4136", "f3468", "f1040nr"]
for y in sorted({year, year - 1}):
    codes = {i: status(f"{SITE}/forms/{y}/{i}.pdf") for i in sample if i in ids}
    bad = {k: v for k, v in codes.items() if v != 200}
    print(f"PDFs {y}: {len(codes) - len(bad)}/{len(codes)} ok" + (f"; failing {bad}" if bad else ""))
print("fill page:", status(f"{SITE}/fill"))
