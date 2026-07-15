"""Resume grading + skill-gap pipeline. All logic in one file; split when it grows."""
import io
import json
import re
from pathlib import Path
from urllib.parse import quote_plus

import pdfplumber

from . import courses

DATA = Path(__file__).parent / "data"
SKILLS = json.loads((DATA / "skills.json").read_text())["skills"]
ROLES = json.loads((DATA / "roles.json").read_text())["roles"]

ACTION_VERBS = {
    "built", "designed", "led", "developed", "created", "implemented", "improved",
    "reduced", "increased", "launched", "managed", "shipped", "optimized",
    "automated", "delivered", "architected", "migrated", "scaled", "engineered",
    "collaborated", "coordinated", "analyzed", "researched", "tested", "deployed",
    "maintained", "integrated", "refactored", "streamlined", "spearheaded",
    "drove", "owned", "mentored", "trained", "presented", "wrote", "authored",
    "resolved", "debugged", "enhanced", "achieved", "generated", "boosted",
    "cut", "saved", "grew", "expanded", "established", "initiated", "executed",
}
# each section counts if ANY of its synonyms appear
SECTION_PATTERNS = {
    "experience": r"experience|employment|work history|professional background",
    "education": r"education|academic|university|degree",
    "skills": r"skills|proficienc|technolog|competenc",
    "projects": r"projects|portfolio",
}


def extract_text(data: bytes, filename: str) -> str:
    if filename.lower().endswith(".pdf"):
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    return data.decode("utf-8", errors="ignore")


def detect_skills(text: str) -> list[str]:
    low = text.lower()
    found = []
    for skill, aliases in SKILLS.items():
        # word-boundary match so "js" doesn't hit "jsx", "java" doesn't hit "javascript"
        if any(re.search(rf"(?<![a-z0-9]){re.escape(a)}(?![a-z0-9])", low) for a in aliases):
            found.append(skill)
    return found


def features(text: str, skills: list[str]) -> dict:
    words = re.findall(r"[a-zA-Z']+", text.lower())
    n = max(len(words), 1)
    return {
        "skill_count": len(skills),
        "word_count": len(words),
        "action_verb_ratio": sum(w in ACTION_VERBS for w in words) / n,
        "has_numbers": int(bool(re.search(r"\d+%|\$\d|\d+\+", text))),  # quantified impact
        "section_coverage": sum(bool(re.search(p, text.lower())) for p in SECTION_PATTERNS.values()) / len(SECTION_PATTERNS),
    }


# Deterministic deep-links per skill: reputable platforms, no dead/hallucinated URLs.
# ponytail: search links, not scraped listings — add a real search API only if users
# want specific ranked courses rather than "browse these platforms".
_PLATFORMS = [
    ("YouTube", "free", "https://www.youtube.com/results?search_query={q}+tutorial"),
    ("freeCodeCamp", "free", "https://www.freecodecamp.org/news/search/?query={q}"),
    ("Coursera", "paid", "https://www.coursera.org/search?query={q}"),
    ("Udemy", "paid", "https://www.udemy.com/courses/search/?q={q}"),
]


def learning_resources(skill: str) -> list[dict]:
    q = quote_plus(skill)
    return [{"label": name, "type": kind, "url": tmpl.format(q=q)} for name, kind, tmpl in _PLATFORMS]


def _in_text(low: str, aliases: list[str]) -> bool:
    return any(re.search(rf"(?<![a-z0-9]){re.escape(a)}(?![a-z0-9])", low) for a in aliases)


def gap_from_requirements(text: str, req: dict) -> dict:
    """Gap analysis against LLM-generated role requirements (any role)."""
    low = text.lower()
    aliases = req["aliases"]
    matched, missing = {}, {}
    for skill, imp in req["required"].items():
        (matched if _in_text(low, aliases.get(skill, [skill])) else missing)[skill] = imp
    total = sum(req["required"].values()) or 1
    ranked_missing = [s for s, _ in sorted(missing.items(), key=lambda kv: -kv[1])]
    return {
        "role": req["title"],
        "match_pct": round(sum(matched.values()) / total * 100, 1),
        "matched": sorted(matched, key=matched.get, reverse=True),
        "missing": ranked_missing,
        "resources": {
            s: {"courses": courses.search_courses(s), "search": learning_resources(s)}
            for s in ranked_missing
        },
    }


def gap_analysis(role_key: str, skills: list[str]) -> dict:
    role = ROLES[role_key]
    have = set(skills)
    missing = {s: imp for s, imp in role["required"].items() if s not in have}
    matched = {s: imp for s, imp in role["required"].items() if s in have}
    total = sum(role["required"].values())
    coverage = sum(matched.values()) / total if total else 0.0
    return {
        "role": role["title"],
        "match_pct": round(coverage * 100, 1),
        "matched": sorted(matched, key=matched.get, reverse=True),
        "missing": [s for s, _ in sorted(missing.items(), key=lambda kv: -kv[1])],
    }


if __name__ == "__main__":
    sample = "Built REST APIs in Java and Spring Boot. Improved latency by 40%. Skills: SQL, Docker, Git. Experience and Education below."
    sk = detect_skills(sample)
    assert "java" in sk and "spring" in sk and "sql" in sk, sk
    assert "javascript" not in sk, "word-boundary should reject javascript"
    f = features(sample, sk)
    assert f["has_numbers"] == 1 and f["action_verb_ratio"] > 0, f
    g = gap_analysis("backend_engineer", sk)
    assert 0 <= g["match_pct"] <= 100 and "kubernetes" in g["missing"], g
    print("ok", sk, f, g)
