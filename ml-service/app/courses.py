"""Real course recommendations for a skill — keyless web search via DuckDuckGo's HTML endpoint.

No API key, no config. Scrapes html.duckduckgo.com (organic results only; ads skipped),
caches per skill. Returns [] on any network/parse error so callers fall back to
pipeline.learning_resources() browse links.
"""
import html
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

CACHE_FILE = Path(__file__).parent / "courses_cache.json"
ENDPOINT = "https://html.duckduckgo.com/html/"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
PAID_DOMAINS = ("udemy.com", "coursera.org", "pluralsight.com", "codecademy.com",
                "datacamp.com", "educative.io", "linkedin.com")
_RESULT = re.compile(r'<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)</a>', re.S)


def _cache() -> dict:
    return json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {}


def _real_url(ddg_href: str) -> str | None:
    """DuckDuckGo wraps targets as //duckduckgo.com/l/?uddg=<encoded real url>."""
    q = urllib.parse.urlparse(ddg_href).query
    uddg = urllib.parse.parse_qs(q).get("uddg", [None])[0]
    return urllib.parse.unquote(uddg) if uddg else None


def _classify(url: str) -> str:
    return "paid" if any(d in url for d in PAID_DOMAINS) else "free"


def search_courses(skill: str, n: int = 4) -> list[dict]:
    key = skill.strip().lower()
    cache = _cache()
    if key in cache:
        return cache[key]

    q = urllib.parse.urlencode({"q": f"{skill} online course tutorial"})
    req = urllib.request.Request(f"{ENDPOINT}?{q}", headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            page = resp.read().decode("utf-8", "ignore")
    except Exception:
        return []  # keep the browse-link fallback working

    courses = []
    seen = set()
    for href, title in _RESULT.findall(page):
        url = _real_url(href)
        # skip ads (DDG routes them through y.js / bing aclick) and dupes
        if not url or "duckduckgo.com/y.js" in url or "bing.com/aclick" in url:
            continue
        domain = urllib.parse.urlparse(url).netloc.replace("www.", "")
        if domain in seen:
            continue
        seen.add(domain)
        text = html.unescape(re.sub(r"<[^>]+>", "", title)).strip()
        courses.append({"title": text[:90], "url": url, "source": domain, "type": _classify(url)})
        if len(courses) >= n:
            break

    if courses:
        cache[key] = courses
        CACHE_FILE.write_text(json.dumps(cache, indent=2))
    return courses


if __name__ == "__main__":
    res = search_courses("tensorflow")
    assert res and all(r["url"].startswith("http") for r in res), res
    assert not any("y.js" in r["url"] for r in res), "ads leaked"
    for r in res:
        print(f'[{r["type"]}] {r["source"]}: {r["title"]}')
