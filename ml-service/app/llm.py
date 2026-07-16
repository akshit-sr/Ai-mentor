"""Wrap local Ollama (qwen2.5:7b) to produce required-skills for ANY role.

ponytail: prompt-engineered + cached, not fine-tuned. Train a LoRA on curated
role->skills pairs only if prompt quality proves insufficient.
"""
import json
import os
import urllib.request
from pathlib import Path

CACHE_FILE = Path(__file__).parent / "roles_cache.json"

# Provider switch: local Ollama by default; set LLM_PROVIDER=groq (+ GROQ_API_KEY) for free cloud hosting.
PROVIDER = os.getenv("LLM_PROVIDER", "ollama").lower()
OLLAMA = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_KEY = os.getenv("GROQ_API_KEY", "")


def _chat(system: str, user: str, temperature: float, timeout: int) -> str:
    """One JSON-mode chat call, provider-agnostic. Returns the raw content string."""
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    if PROVIDER == "groq":
        # Groq's Cloudflare 403s the default Python-urllib user-agent; send a normal one.
        url, headers = GROQ_URL, {"Content-Type": "application/json", "User-Agent": "ai-mentor/1.0",
                                  "Authorization": f"Bearer {GROQ_KEY}"}
        payload = {"model": GROQ_MODEL, "messages": messages, "temperature": temperature,
                   "response_format": {"type": "json_object"}}
    else:
        url, headers = OLLAMA, {"Content-Type": "application/json"}
        payload = {"model": OLLAMA_MODEL, "format": "json", "stream": False,
                   "options": {"temperature": temperature}, "messages": messages}
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read())
    return data["choices"][0]["message"]["content"] if PROVIDER == "groq" else data["message"]["content"]

SYSTEM = (
    "You are a technical recruiter. For a given job role, list the skills it "
    "requires. Respond ONLY with JSON of the form: "
    '{"title": "<clean role name>", "skills": [{"name": "<skill>", '
    '"importance": <1-3>, "aliases": ["<lowercase variant>", ...]}, ...]}. '
    "importance: 3=core, 2=important, 1=nice-to-have. Give 8-14 skills. "
    "aliases are lowercase strings a resume might use for that skill "
    '(e.g. "javascript" -> ["javascript","js"]).'
)


def _cache() -> dict:
    return json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {}


def role_requirements(role: str) -> dict:
    """{title, required: {skill: importance}, aliases: {skill: [..]}} for any role."""
    key = role.strip().lower()
    cache = _cache()
    if key in cache:
        return cache[key]

    data = json.loads(_chat(SYSTEM, f"Role: {role}", 0.2, 120))

    required, aliases = {}, {}
    for s in data.get("skills", []):
        name = str(s["name"]).strip().lower()
        if not name:
            continue
        required[name] = int(s.get("importance", 2))
        al = [str(a).strip().lower() for a in s.get("aliases", []) if str(a).strip()]
        aliases[name] = sorted(set(al + [name]))
    out = {"title": data.get("title", role).strip() or role, "required": required, "aliases": aliases}

    cache[key] = out
    CACHE_FILE.write_text(json.dumps(cache, indent=2))
    return out


ROADMAP_SYSTEM = (
    "You are a pragmatic career mentor. Build a realistic, phased upskilling roadmap "
    "for the person's exact situation. Respond ONLY with JSON: "
    '{"summary": "<2-3 sentence direct plan overview>", "phases": [{"title": "<phase name>", '
    '"duration": "<e.g. Weeks 1-3>", "focus": "<one line>", "skills": ["<skill>", ...], '
    '"milestone": "<concrete thing they can show/do after this phase>"}]}. '
    "Give 3-5 phases, foundations first. Pace the durations to the weekly hours given. "
    "Ground the skills in the listed gaps. Be specific and encouraging, not generic."
)


def generate_roadmap(role: str, missing: list[str], situation: str, hours: int) -> dict:
    ctx = (
        f"Target role: {role}\n"
        f"Situation: {situation}\n"
        f"Weekly hours available: {hours}\n"
        f"Skill gaps to close: {', '.join(missing) if missing else 'general foundations for the role'}\n"
    )
    if situation == "unemployed":
        ctx += ("They are between jobs and can study intensively. Make it a serious, full-time "
                "roadmap that also includes building a portfolio project and interview prep.")
    elif situation == "student":
        ctx += "They are a student fitting this around coursework. Keep the pace sustainable."
    else:
        ctx += "They work full-time; respect the limited weekly hours and keep phases achievable."

    data = json.loads(_chat(ROADMAP_SYSTEM, ctx, 0.4, 180))
    return {"summary": data.get("summary", ""), "phases": data.get("phases", [])}


if __name__ == "__main__":
    r = role_requirements("Machine Learning Engineer")
    assert r["required"], r
    assert any("python" in a for a in r["aliases"].values()), r
    print("ok", r["title"], list(r["required"].items())[:5])
