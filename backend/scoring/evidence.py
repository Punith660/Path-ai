from __future__ import annotations

from .utils import SKILL_KEYWORDS, clamp_score, count_phrase_occurrences, format_count_detail, format_keyword


def _skill_score(count: int) -> float:
    if count <= 0:
        return 0.0
    if count == 1:
        return 0.3
    if 2 <= count <= 3:
        return 0.6
    return 1.0


def score_evidence(text: str) -> dict:
    detected_skills: list[dict[str, int]] = []
    details: list[str] = []

    for skill in SKILL_KEYWORDS:
        count = count_phrase_occurrences(text, skill)
        if count > 0:
            detected_skills.append({"skill": skill, "count": count})
            details.append(format_count_detail(format_keyword(skill), count))

    if not detected_skills:
        return {
            "score": 0.0,
            "details": ["No predefined skills detected"],
            "detected_skills": [],
            "unique_skill_count": 0,
            "total_skill_mentions": 0,
        }

    average_score = sum(_skill_score(item["count"]) for item in detected_skills) / len(detected_skills)
    return {
        "score": clamp_score(average_score),
        "details": details,
        "detected_skills": detected_skills,
        "unique_skill_count": len(detected_skills),
        "total_skill_mentions": sum(item["count"] for item in detected_skills),
    }
