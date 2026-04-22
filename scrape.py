"""Brighton Fringe test scrape — 20 events."""
from __future__ import annotations

import hashlib
import json
import random
import re
import time
from pathlib import Path
from urllib.parse import urljoin
from xml.etree import ElementTree as ET

import httpx
from selectolax.parser import HTMLParser

UA = "brighton-fringe-hobby-scraper/0.1 (contact: accounts@createwith.com)"
BASE = "https://www.brightonfringe.org"
SITEMAP = f"{BASE}/events-sitemap.xml"
CACHE = Path("cache")
CACHE.mkdir(exist_ok=True)

NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def fetch_cached(client: httpx.Client, url: str) -> str:
    key = hashlib.sha256(url.encode()).hexdigest()[:16]
    path = CACHE / f"{key}.html"
    if path.exists():
        return path.read_text()
    r = client.get(url, follow_redirects=True, timeout=30)
    r.raise_for_status()
    path.write_text(r.text)
    return r.text


def load_sitemap_urls(client: httpx.Client) -> list[tuple[str, str]]:
    xml = fetch_cached(client, SITEMAP)
    root = ET.fromstring(xml)
    out: list[tuple[str, str]] = []
    for u in root.findall("sm:url", NS):
        loc = u.findtext("sm:loc", namespaces=NS) or ""
        lastmod = u.findtext("sm:lastmod", namespaces=NS) or ""
        if not loc or loc.rstrip("/") == f"{BASE}/events":
            continue
        out.append((loc, lastmod))
    return out


def clean(s: str | None) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


AGE_RE = re.compile(r"(\d+)\s*\+\s*(?:\((Guideline|Restriction)\))?", re.IGNORECASE)


def parse_age(s: str | None) -> dict | None:
    if not s:
        return None
    m = AGE_RE.search(s)
    if not m:
        return {"raw": s}
    return {"min_age": int(m.group(1)), "type": (m.group(2) or "").title() or None, "raw": s}


def _split_access_and_warnings(detail_node) -> tuple[list[str], list[str]]:
    """Walk children of detail block and split img alts into pre-"Content Warnings:" vs post."""
    if not detail_node:
        return [], []
    html = detail_node.html or ""
    cutoff = re.search(r"Content Warnings?\s*:?", html, re.IGNORECASE)
    seen_access, seen_warnings = [], []
    for img in detail_node.css("img"):
        alt = clean(img.attributes.get("alt") or "")
        if not alt:
            continue
        # position of this img tag in the block's html
        raw = img.html or ""
        pos = html.find(raw) if raw else -1
        bucket = seen_warnings if cutoff and pos >= cutoff.start() else seen_access
        if alt not in bucket:
            bucket.append(alt)
    return seen_access, seen_warnings


def extract_event(url: str, html: str) -> dict:
    tree = HTMLParser(html)
    g = lambda sel: tree.css_first(sel)
    attr = lambda sel, a: (g(sel).attributes.get(a) if g(sel) else None)

    # --- basics
    title = clean(g(".etron-event-title").text()) if g(".etron-event-title") else None
    og_desc = attr('meta[property="og:description"]', "content")
    meta_desc = attr('meta[name="description"]', "content")

    # --- JSON-LD (Yoast WebPage schema — gives us dateModified)
    date_modified = None
    for s in tree.css('script[type="application/ld+json"]'):
        try:
            data = json.loads(s.text())
        except json.JSONDecodeError:
            continue
        for node in data.get("@graph", [data]):
            if node.get("@type") == "WebPage" and node.get("dateModified"):
                date_modified = node["dateModified"]
                break
        if date_modified:
            break

    # --- hero image (lazyloaded — prefer data-src-img, fall back to <noscript>)
    hero = None
    hero_node = g("#etron-event-image img")
    if hero_node:
        hero = hero_node.attributes.get("data-src-img") or hero_node.attributes.get("src")
        if hero and hero.startswith("data:"):
            ns = g("#etron-event-image noscript img")
            hero = ns.attributes.get("src") if ns else None

    # --- description (keep rendered text + raw inner HTML so paragraph breaks survive)
    desc_node = g(".etron-description")
    description = clean(desc_node.text(separator=" ")) if desc_node else None
    description_html = desc_node.html if desc_node else None

    # --- gallery (carousel — defend against lazyload placeholder)
    gallery = []
    for img in tree.css("img.make-carousel"):
        src = img.attributes.get("data-src-img") or img.attributes.get("src")
        if src and not src.startswith("data:") and src != hero:
            gallery.append(src)

    # --- detail sidebar (unstructured — regex over rendered text)
    detail_node = g("#etron-event-detail-block")
    detail_text = clean(detail_node.text(separator=" ")) if detail_node else ""
    # Strip known standalone boilerplate that bleeds into adjacent fields when
    # its own parent label (Duration) is absent.
    detail_text = re.sub(r"\s*This event has an interval\.", "", detail_text)

    def field(label: str) -> str | None:
        # Require the colon after the label so we don't match the label word
        # appearing inside another field's value (e.g. company named "Genre Story Improv").
        m = re.search(
            rf"(?<![A-Za-z]){label}:\s*([^:]+?)(?=\s+(?:Company|Genre|Duration|Venues?|Age suitability|Babes in Arms|Content Warnings?|Venue Accessibility|This is combined information|For any queries)\b|$)",
            detail_text,
            re.IGNORECASE,
        )
        return clean(m.group(1)) if m else None

    genre = field("Genre")
    duration = field("Duration")
    company = field("Company")
    age_raw = field("Age suitability")
    babes = field("Babes in Arms policy")

    # company website
    website = None
    if detail_node:
        for a in detail_node.css("a"):
            if "Website" in (a.text() or ""):
                website = a.attributes.get("href")
                break

    accessibility, content_warnings = _split_access_and_warnings(detail_node)

    # --- social links
    socials: dict[str, str] = {}
    for a in tree.css("#etron-social-block a[href]"):
        href = a.attributes.get("href", "")
        for key in ("facebook", "twitter", "tiktok", "instagram", "youtube"):
            if key in href.lower():
                socials.setdefault(key, href)

    # --- performances
    perfs = []
    for row in tree.css(".etron-perf-row"):
        cls = row.attributes.get("class", "")
        m = re.search(r"perfdate(\d{4}-\d{2}-\d{2})", cls)
        iso_date = m.group(1) if m else None

        c1 = row.css_first(".etron-perf-column-one")
        date_text = clean(c1.css_first("h4").text()) if c1 and c1.css_first("h4") else None
        time_text = clean(c1.css_first("h5").text()) if c1 and c1.css_first("h5") else None
        venue_a = c1.css_first("a.venue-link") if c1 else None
        venue_name = clean(venue_a.text()) if venue_a else None
        venue_href = venue_a.attributes.get("href") if venue_a else None
        venue_url = urljoin(BASE + "/", venue_href) if venue_href else None
        venue_slug = venue_href.rstrip("/").split("/")[-1] if venue_href else None

        c2 = row.css_first(".etron-perf-column-two")
        price_text = clean(c2.text(separator=" ")) if c2 else None
        free = bool(re.search(r"\bFREE\b", price_text or "", re.IGNORECASE))
        prices = dict(re.findall(r"([A-Za-z][\w ]*?):\s*£\s*([\d.]+)", price_text or ""))

        perf_id = None
        btn = row.css_first("button.etron-button-tickets")
        if btn:
            onclick = btn.attributes.get("onclick", "")
            m = re.search(r"etronGetTix\('(\d+)'", onclick)
            perf_id = m.group(1) if m else None

        perfs.append(
            {
                "date_iso": iso_date,
                "date_text": date_text,
                "time_text": time_text,
                "venue_name": venue_name,
                "venue_slug": venue_slug,
                "venue_url": venue_url,
                "price_raw": price_text,
                "free": free,
                "prices": {k.strip(): float(v) for k, v in prices.items()},
                "performance_id": perf_id,
            }
        )

    return {
        "url": url,
        "slug": url.rstrip("/").split("/")[-1],
        "title": title,
        "description": description,
        "description_html": description_html,
        "meta_description": meta_desc,
        "og_description": og_desc,
        "date_modified": date_modified,
        "hero_image": hero,
        "gallery": gallery,
        "genre": genre,
        "duration": duration,
        "company": company,
        "website": website,
        "age_suitability": age_raw,
        "age": parse_age(age_raw),
        "babes_in_arms": babes,
        "accessibility": accessibility,
        "content_warnings": content_warnings,
        "socials": socials,
        "performances": perfs,
    }


def main():
    delay = 1.5
    with httpx.Client(headers={"User-Agent": UA}) as client:
        all_urls = load_sitemap_urls(client)
        total = len(all_urls)
        print(f"sitemap: {total} events  delay={delay}s")

        results = []
        failed = []
        for i, (url, lastmod) in enumerate(all_urls, 1):
            try:
                t0 = time.time()
                html = fetch_cached(client, url)
                cached_html = (time.time() - t0) < 0.05
                data = extract_event(url, html)
                data["lastmod"] = lastmod
                results.append(data)
                if i % 25 == 0 or i == total:
                    Path("results.json").write_text(
                        json.dumps(results, indent=2, ensure_ascii=False)
                    )
                if i % 50 == 0 or i <= 5 or not cached_html and i % 10 == 0:
                    n_imgs = len([u for u in [data["hero_image"], *data["gallery"]] if u])
                    print(
                        f"[{i:4}/{total}] {'CACHE' if cached_html else 'FETCH'} {data['slug'][:55]:55} "
                        f"perfs={len(data['performances'])} imgs={n_imgs}"
                    )
                if not cached_html:
                    time.sleep(delay)
            except Exception as e:
                failed.append({"url": url, "error": repr(e)})
                print(f"[{i:4}/{total}] FAIL  {url}  {e!r}")

    Path("results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False))
    Path("failed.json").write_text(json.dumps(failed, indent=2))
    print(f"\ndone: {len(results)}/{total} ok, {len(failed)} failed")


if __name__ == "__main__":
    main()
