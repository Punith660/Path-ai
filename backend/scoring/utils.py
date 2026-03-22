from __future__ import annotations

import re


SKILL_KEYWORDS = ["python", "java", "machine learning", "sql", "aws", "docker"]
ACTION_VERBS = ["built", "developed", "designed", "deployed", "optimized", "implemented"]
PROJECT_INDICATORS = ["project", "system", "pipeline", "application", "api"]
SENIOR_TITLES = ["senior", "lead", "principal"]


def normalize_text(text: str) -> str:
    return (text or "").strip().lower()


def clamp_score(value: float) -> float:
    return max(0.0, min(1.0, value))


def count_phrase_occurrences(text: str, phrase: str) -> int:
    escaped = re.escape(phrase)
    pattern = rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"
    return len(re.findall(pattern, text, flags=re.IGNORECASE))


def format_keyword(phrase: str) -> str:
    return " ".join(part.capitalize() for part in phrase.split())


def format_count_detail(label: str, count: int) -> str:
    if count == 1:
        return f"{label} mentioned once"
    return f"{label} mentioned {count} times"


def extract_years_of_experience(text: str) -> int | None:
    matches = re.findall(r"\b(\d+)\s*\+?\s*years?\b", text, flags=re.IGNORECASE)
    if not matches:
        return None
    return max(int(match) for match in matches)
