from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel

from . import grade as grader
from . import llm
from . import pipeline as p

app = FastAPI(title="AI Mentor ML Service")


class RoadmapReq(BaseModel):
    role: str
    missing: list[str] = []
    situation: str = "working"   # student | working | unemployed
    hours: int = 8


class TextReq(BaseModel):
    text: str
    target_role: str


def _assess(text: str, target_role: str) -> dict:
    if len(text.strip()) < 30:
        raise HTTPException(422, "could not extract enough text from resume")
    try:
        req = llm.role_requirements(target_role)
    except Exception as e:
        raise HTTPException(502, f"role model unavailable: {e}")
    skills = p.detect_skills(text)
    feats = p.features(text, skills)
    return {
        "skills_detected": skills,
        "grade": grader.grade(feats),
        "gap": p.gap_from_requirements(text, req),
        "features": feats,
        "resume_text": text,
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/roles")
def roles():
    # suggestions only; any free-text role works via the LLM
    return {k: v["title"] for k, v in p.ROLES.items()}


@app.post("/analyze")
async def analyze(request: Request, target_role: str, filename: str = "resume.txt"):
    text = p.extract_text(await request.body(), filename)
    return _assess(text, target_role)


@app.post("/analyze_text")
def analyze_text(body: TextReq):
    return _assess(body.text, body.target_role)


@app.post("/roadmap")
def roadmap(body: RoadmapReq):
    try:
        return llm.generate_roadmap(body.role, body.missing, body.situation, body.hours)
    except Exception as e:
        raise HTTPException(502, f"role model (Ollama) unavailable: {e}")
