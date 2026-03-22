from __future__ import annotations

from .consistency import score_consistency
from .depth import score_depth
from .evidence import score_evidence
from .utils import clamp_score


def score_resume_text(text: str) -> dict:
    evidence_result = score_evidence(text)
    depth_result = score_depth(text, evidence_result["total_skill_mentions"])
    consistency_result = score_consistency(
        text,
        evidence_result["total_skill_mentions"],
        depth_result["score"],
    )

    confidence = (
        (0.5 * evidence_result["score"])
        + (0.3 * depth_result["score"])
        + (0.2 * consistency_result["score"])
    )

    return {
        "confidence": round(clamp_score(confidence), 2),
        "signals": {
            "evidence_score": {
                "score": round(evidence_result["score"], 2),
                "details": evidence_result["details"],
            },
            "depth_score": {
                "score": round(depth_result["score"], 2),
                "details": depth_result["details"],
            },
            "consistency_score": {
                "score": round(consistency_result["score"], 2),
                "details": consistency_result["details"],
            },
        },
    }
