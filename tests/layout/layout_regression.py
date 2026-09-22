#!/usr/bin/env python3
"""Automated layout + visual regression tests for Eternal — Memories.

Checks every reviewed area (landing page, feed, memory cards, gallery, family
tree, vault) at a desktop and a mobile breakpoint for:

  * horizontal page overflow (document wider than the viewport)
  * individual elements sticking out past the right viewport edge
  * clipped / overflowing text in elements that do not opt into clipping
  * browser console errors
  * pixel drift against a stored screenshot baseline

Usage
-----
    bun run test:layout                 # run all checks
    UPDATE_BASELINE=1 bun run test:layout   # accept current rendering as baseline

Environment
-----------
    BASE_URL      default http://localhost:8080
    TEST_EMAIL    account used for the signed-in areas
    TEST_PASSWORD password for that account
    PIXEL_TOLERANCE  allowed share of differing pixels (default 0.01 = 1%)

The script never writes to the database; it only reads pages.
"""

from __future__ import annotations

import asyncio
import json
import os
import pathlib
import sys

from PIL import Image, ImageChops
from playwright.async_api import async_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")
EMAIL = os.environ.get("TEST_EMAIL", "dev1@eternalmemorys.enterprises")
PASSWORD = os.environ.get("TEST_PASSWORD", "Em-idKWNfQqWEuw9O2")
UPDATE_BASELINE = os.environ.get("UPDATE_BASELINE") == "1"
PIXEL_TOLERANCE = float(os.environ.get("PIXEL_TOLERANCE", "0.01"))

HERE = pathlib.Path(__file__).parent
BASELINE_DIR = HERE / "baseline"
CURRENT_DIR = HERE / "current"

VIEWPORTS = [("desktop", 1280, 1800), ("mobile", 390, 1600)]

# name, path, needs sign-in
PAGES = [
    ("landing", "/", False),
    ("demo-feed", "/demo", False),
    ("feed", "/feed", True),
    ("gallery", "/gallery", True),
    ("tree", "/tree", True),
    ("vault", "/vault", True),
]

# Elements that legitimately extend past the viewport edge or clip their text.
IGNORE_SELECTOR = (
    "[data-layout-ignore], [aria-hidden='true'], .sr-only, "
    "[data-radix-popper-content-wrapper], [data-sonner-toaster]"
)

MEASURE_JS = """
(ignoreSelector) => {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const ignored = new Set(Array.from(document.querySelectorAll(ignoreSelector)));
  const isIgnored = (el) => {
    for (let n = el; n; n = n.parentElement) if (ignored.has(n)) return true;
    return false;
  };

  const overflowing = [];
  const clipped = [];
  const smallTargets = [];

  for (const el of document.body.querySelectorAll("*")) {
    if (isIgnored(el)) continue;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const describe = () =>
      el.tagName.toLowerCase() +
      (el.id ? "#" + el.id : "") +
      (el.className && typeof el.className === "string"
        ? "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".")
        : "");

    if (rect.right > vw + 2 && style.position !== "fixed") {
      overflowing.push({ selector: describe(), right: Math.round(rect.right), viewport: vw });
    }

    const overflowVisible = style.overflowX === "visible" && style.overflowY === "visible";
    const hasText = el.children.length === 0 && (el.textContent || "").trim().length > 0;
    if (hasText && overflowVisible && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      clipped.push({
        selector: describe(),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        text: (el.textContent || "").trim().slice(0, 60),
      });
    }

    if (vw < 768 && (el.tagName === "BUTTON" || el.tagName === "A") && el.offsetParent !== null) {
      if (rect.height > 0 && rect.height < 40 && (el.textContent || "").trim().length > 0) {
        smallTargets.push({ selector: describe(), height: Math.round(rect.height) });
      }
    }
  }

  return {
    pageOverflow: Math.max(0, doc.scrollWidth - vw),
    overflowing: overflowing.slice(0, 10),
    clipped: clipped.slice(0, 10),
    smallTargets: smallTargets.slice(0, 10),
  };
}
"""


def compare_screenshot(name: str) -> tuple[str, str]:
    """Returns (status, detail). status is ok | baseline-created | drift."""
    baseline = BASELINE_DIR / f"{name}.png"
    current = CURRENT_DIR / f"{name}.png"
    if UPDATE_BASELINE or not baseline.exists():
        baseline.parent.mkdir(parents=True, exist_ok=True)
        baseline.write_bytes(current.read_bytes())
        return "baseline-created", "stored as new baseline"

    a = Image.open(baseline).convert("RGB")
    b = Image.open(current).convert("RGB")
    if a.size != b.size:
        return "drift", f"size changed {a.size} -> {b.size}"
    diff = ImageChops.difference(a, b).convert("L").point(lambda p: 255 if p > 24 else 0)
    changed = sum(diff.histogram()[255:])
    share = changed / float(a.size[0] * a.size[1])
    if share > PIXEL_TOLERANCE:
        return "drift", f"{share * 100:.2f}% of pixels changed (limit {PIXEL_TOLERANCE * 100:.2f}%)"
    return "ok", f"{share * 100:.2f}% pixel difference"


async def sign_in(context, page) -> bool:
    """Restore an injected session if one exists, otherwise use the login form."""
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    if cookies_json or (storage_key and session_json):
        if cookies_json:
            await context.add_cookies(
                [{**c, "url": BASE_URL} for c in json.loads(cookies_json)]
            )
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        if storage_key and session_json:
            await page.evaluate(
                f"localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
        await page.goto(f"{BASE_URL}/feed", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        if "/auth" not in page.url:
            return True

    await page.goto(f"{BASE_URL}/auth", wait_until="domcontentloaded")
    try:
        await page.fill("#email", EMAIL)
        await page.fill("#password", PASSWORD)
        await page.get_by_role("button", name="Sign in", exact=False).last.click()
        await page.wait_for_url(lambda url: "/auth" not in url, timeout=20000)
        return True
    except Exception as err:  # noqa: BLE001 - reported, not raised
        print(f"  ! sign-in failed: {err}")
        return False



async def check_page(page, name: str, path: str, label: str, width: int) -> list[str]:
    failures: list[str] = []
    console_errors: list[str] = []
    page.on(
        "console",
        lambda msg: console_errors.append(msg.text) if msg.type == "error" else None,
    )

    await page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded")
    try:
        await page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:  # noqa: BLE001 - a busy page still gets measured below
        pass
    # Freeze animations, reveal effects and blinking cursors so screenshots are stable.
    await page.add_style_tag(
        content=(
            "*,*::before,*::after{animation:none!important;transition:none!important;"
            "caret-color:transparent!important}"
            "[data-inview]{opacity:1!important;transform:none!important}"
        )
    )
    # Wait until every already-requested image finished decoding, so screenshots
    # do not depend on network timing.
    try:
        await page.wait_for_function(
            "Array.from(document.images).every((i) => i.complete)", timeout=15000
        )
    except Exception:  # noqa: BLE001
        pass
    await page.wait_for_timeout(2000)



    result = await page.evaluate(MEASURE_JS, IGNORE_SELECTOR)
    key = f"{name}-{label}"

    if result["pageOverflow"] > 1:
        failures.append(f"{key}: page scrolls sideways by {result['pageOverflow']}px")
    for item in result["overflowing"]:
        failures.append(
            f"{key}: {item['selector']} reaches {item['right']}px (viewport {width}px)"
        )
    for item in result["clipped"]:
        failures.append(
            f"{key}: text cut off in {item['selector']} "
            f"({item['scrollWidth']}px in {item['clientWidth']}px): {item['text']!r}"
        )
    for item in result["smallTargets"]:
        print(f"  · note {key}: small tap target {item['selector']} ({item['height']}px)")

    if console_errors:
        failures.append(f"{key}: console error — {console_errors[0][:160]}")

    CURRENT_DIR.mkdir(parents=True, exist_ok=True)
    await page.screenshot(path=str(CURRENT_DIR / f"{key}.png"))
    status, detail = compare_screenshot(key)
    print(f"  {'✗' if status == 'drift' else '·'} {key}: {status} ({detail})")
    if status == "drift":
        failures.append(f"{key}: visual drift — {detail}")

    return failures


async def main() -> int:
    failures: list[str] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for label, width, height in VIEWPORTS:
            context = await browser.new_context(viewport={"width": width, "height": height})
            page = await context.new_page()
            signed_in = await sign_in(context, page)
            print(f"\n{label} ({width}px) — signed in: {signed_in}")
            for name, path, needs_auth in PAGES:
                if needs_auth and not signed_in:
                    failures.append(f"{name}-{label}: skipped, sign-in unavailable")
                    continue
                failures.extend(await check_page(page, name, path, label, width))
            await context.close()
        await browser.close()

    print("\n" + "=" * 60)
    if failures:
        print(f"LAYOUT REGRESSIONS: {len(failures)}")
        for f in failures:
            print(f"  ✗ {f}")
    else:
        print("LAYOUT OK — no overflow, no clipped text, no visual drift.")
    (HERE / "last-run.json").write_text(json.dumps({"failures": failures}, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
