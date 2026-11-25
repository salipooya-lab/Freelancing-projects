#!/usr/bin/env python3
"""Fetch the 5 latest BBC Persian top stories as JSON.

Source: https://www.bbc.com/persian (bbcpersian.com redirects here).
Parses the __NEXT_DATA__ JSON: pageData.curations[0] == "مهمترین خبرها".

Output: JSON array of {title, description, url, published}.
"""
import json
import re
import subprocess
import sys

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def fetch_html(url: str) -> str:
    proc = subprocess.run(
        ["curl", "-sS", "--max-time", "25", "-A", UA, url],
        capture_output=True, text=True, timeout=35,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"curl failed: {proc.stderr.strip()[:200]}")
    return proc.stdout


def latest_five(html: str):
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        html, re.S,
    )
    if not m:
        raise RuntimeError("__NEXT_DATA__ not found in homepage")
    data = json.loads(m.group(1))
    curations = data["props"]["pageProps"]["pageData"]["curations"]
    top = next(c for c in curations if c.get("title") == "مهمترین خبرها")
    out = []
    for s in top.get("summaries", [])[:5]:
        link = s.get("link") or {}
        href = link.get("href") if isinstance(link, dict) else link
        out.append({
            "title": (s.get("title") or "").strip(),
            "description": (s.get("description") or "").strip(),
            "url": href,
            "published": s.get("lastPublished") or s.get("firstPublished"),
        })
    return out


def main() -> int:
    try:
        html = fetch_html("https://www.bbc.com/persian")
        items = latest_five(html)
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(e)[:200]}, ensure_ascii=False))
        return 1
    print(json.dumps({"ok": True, "items": items}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
