from __future__ import annotations

from .utils import SENIOR_TITLES, count_phrase_occurrences, extract_years_of_experience


def score_consistency(text: str, total_skill_mentions: int, depth_score: float) -> dict:
    years_of_experience = extract_years_of_experience(text)
    senior_title_present = any(count_phrase_occurrences(text, title) > 0 for title in SENIOR_TITLES)

    if total_skill_mentions > 8 and years_of_experience is not None and years_of_experience <= 1:
        return {
            "score": 0.2,
            "details": [f"{total_skill_mentions} skill mentions with {years_of_experience} year experience -> suspicious"],
        }

    if senior_title_present and depth_score < 0.5:
        return {
            "score": 0.3,
            "details": ["Senior title without depth evidence"],
        }

    return {
        "score": 0.8,
        "details": ["Experience consistent with skills"],
    }
