"""Resume grade model. Small logistic regression over resume features.

Trained on synthetic labeled data (no real corpus yet) so the endpoint works
end-to-end. ponytail: synthetic labels -> retrain on real graded resumes when
you have a dataset; swap make_dataset() for a CSV loader.
"""
import numpy as np
from pathlib import Path
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

MODEL_PATH = Path(__file__).parent / "grade_model.joblib"
FEATS = ["skill_count", "word_count", "action_verb_ratio", "has_numbers", "section_coverage"]


def _vec(f: dict) -> list[float]:
    return [f["skill_count"], f["word_count"], f["action_verb_ratio"], f["has_numbers"], f["section_coverage"]]


def make_dataset(n=2000, seed=0):
    rng = np.random.default_rng(seed)
    skill = rng.integers(0, 12, n)
    words = rng.integers(80, 900, n)
    verbs = rng.uniform(0, 0.12, n)
    nums = rng.integers(0, 2, n)
    secs = rng.uniform(0, 1, n)
    # ground-truth "good resume" score -> label; weights encode domain priors
    score = (0.5 * skill / 12 + 0.15 * np.clip(words / 600, 0, 1)
             + 2.0 * verbs + 0.2 * nums + 0.3 * secs)
    y = (score > np.median(score)).astype(int)
    X = np.column_stack([skill, words, verbs, nums, secs])
    return X, y


def _train():
    X, y = make_dataset()
    # StandardScaler is essential: raw word_count (80-900) otherwise dominates the
    # linear term and saturates predict_proba to ~1.0, making every resume grade A.
    m = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)).fit(X, y)
    joblib.dump(m, MODEL_PATH)
    return m


def _model():
    return joblib.load(MODEL_PATH) if MODEL_PATH.exists() else _train()


def grade(f: dict) -> dict:
    prob = float(_model().predict_proba([_vec(f)])[0, 1])
    score = round(prob * 100)
    letter = "A" if score >= 85 else "B" if score >= 70 else "C" if score >= 55 else "D"
    return {"score": score, "grade": letter}


if __name__ == "__main__":
    strong = grade({"skill_count": 10, "word_count": 550, "action_verb_ratio": 0.08, "has_numbers": 1, "section_coverage": 1.0})
    mid = grade({"skill_count": 5, "word_count": 400, "action_verb_ratio": 0.03, "has_numbers": 1, "section_coverage": 0.5})
    weak = grade({"skill_count": 1, "word_count": 120, "action_verb_ratio": 0.0, "has_numbers": 0, "section_coverage": 0.25})
    assert strong["score"] > mid["score"] > weak["score"], (strong, mid, weak)
    # guard against the saturation bug: scores must actually spread, not all pin near 100
    assert strong["score"] - weak["score"] > 25, (strong, weak)
    print("ok", strong, mid, weak)
