from __future__ import annotations

from .utils import ACTION_VERBS, PROJECT_INDICATORS, clamp_score, count_phrase_occurrences, format_keyword


def score_depth(text: str, total_skill_mentions: int) -> dict:
    verb_counts = {verb: count_phrase_occurrences(text, verb) for verb in ACTION_VERBS}
    detected_verbs = [verb for verb, count in verb_counts.items() if count > 0]

    project_context_present = any(count_phrase_occurrences(text, indicator) > 0 for indicator in PROJECT_INDICATORS)

    score = 0.2
    details: list[str] = []

    if detected_verbs:
        score += 0.4
        verb_list = ", ".join(format_keyword(verb).lower() for verb in detected_verbs)
        details.append(f"Action verbs detected: {verb_list}")

    if project_context_present:
        score += 0.4
        details.append("Project context found")

    if total_skill_mentions >= 4 and not detected_verbs:
        score = min(score, 0.3)
        details.append("Many skill mentions but no action verbs detected")

    if not details:
        details.append("No depth indicators found")

    return {
        "score": clamp_score(score),
        "details": details,
        "verb_count": sum(verb_counts.values()),
        "project_context_present": project_context_present,
    }
