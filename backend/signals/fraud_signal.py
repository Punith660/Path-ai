"""Fraud/risk signals: risk score, confidence score, weak areas, and findings aggregation."""

from __future__ import annotations

from typing import Any

from ..verification.knowledge import STRICTNESS


def categorize_claims(claims: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Split claims into inflated and verified buckets based on evidence level."""
    inflated = [c for c in claims if c.get("evidence_level") in {"weak", "missing", "inflated"}]
    verified = [c for c in claims if c.get("evidence_level") in {"demonstrated", "supported"}]
    return inflated, verified


def _truly_inflated(claims: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Filter to claims with evidence_level == 'inflated' only.

    Missing and weak evidence are job-fit or presentation gaps, NOT
    credibility issues.  Only 'inflated' evidence level signifies that a
    claim appears in a skills list without implementation context, which is
    the true fraud/credibility signal.
    """
    return [c for c in claims if c.get("evidence_level") == "inflated"]


def compute_weak_areas(
    missing_skills_raw: list[str],
    action_verbs_list: list[str],
    claims: list[dict[str, Any]],
) -> list[str]:
    """Generate human-readable weak area strings."""
    weak_areas: list[str] = []
    if missing_skills_raw:
        weak_areas.append(f"Missing JD skills: {', '.join(missing_skills_raw[:8])}")
    if not action_verbs_list:
        weak_areas.append("Resume lacks strong action verbs.")
    weak_claims = [c for c in claims if c.get("evidence_level") in {"weak", "inflated"}]
    if weak_claims:
        weak_areas.append(f"{len(weak_claims)} claim(s) rely mainly on skills-list or light context.")
    # New: flag when claims are missing project/experience backing
    project_or_exp_claims = [c for c in claims if c.get("evidence_level") in ("demonstrated", "supported") and c.get("type") != "skill"]
    if not project_or_exp_claims:
        weak_areas.append("No project or experience achievements detected.")
    return weak_areas


def compute_initial_findings(
    missing_skills_raw: list[str],
    action_verbs_list: list[str],
) -> list[dict[str, str]]:
    """Generate initial findings around missing skills and action verbs."""
    findings: list[dict[str, str]] = []
    if missing_skills_raw:
        findings.append(
            {
                "message": f"Resume is missing {len(missing_skills_raw)} job description requirement(s).",
                "severity": "medium",
            }
        )
    if not action_verbs_list:
        findings.append({"message": "No strong action verbs were detected in the resume text.", "severity": "medium"})
    else:
        findings.append({"message": f"Detected action verbs: {', '.join(action_verbs_list[:12])}.", "severity": "low"})
    return findings


def compute_risk_score(
    compatibility: int,
    inflated_claims: list[dict[str, Any]],
    missing_skills_raw: list[str],
    action_verbs_list: list[str],
    consistency_findings: list[dict[str, Any]],
    strictness: str,
    cross_reference_sync: bool,
) -> int:
    """Compute risk score based on credibility/suspicion signals, not job-fit gaps.

    Risk is driven by:
    - Inflated/unsupported claims (credibility) — only claims with
      evidence_level == 'inflated' count.  Missing-skill claims (job-fit
      gaps) do NOT contribute to risk.
    - Cross-reference consistency issues (buzzwords, keyword stuffing).
    - Lack of action verbs (weak evidence base).

    Missing JD skills affect Compatibility, NOT Risk.
    """
    st = STRICTNESS[strictness]
    # Risk starts at zero — driven by suspicious signals, not inverse of compatibility
    risk_score = 0
    # Only truly inflated skill claims erode credibility (skip missing/weak)
    truly_inflated = _truly_inflated(inflated_claims)
    risk_score += len([c for c in truly_inflated if c.get("type") == "skill"]) * st["inflated_penalty"]
    # Cross-reference findings — exclude "missing" findings (those are job-fit gaps, not fraud)
    if cross_reference_sync:
        relevant = [f for f in consistency_findings if f.get("status") in {"inflated", "buzzword"}]
        risk_score += min(40, len(relevant) * (8 if strictness == "high" else 5))
    # No action verbs = passive resume (weak signal)
    if not action_verbs_list:
        risk_score += 10 if strictness == "high" else 6
    return round(max(0, min(100, risk_score)))


def compute_confidence(
    compatibility: int,
    verified_claims: list[dict[str, Any]],
    inflated_claims: list[dict[str, Any]],
    action_verbs_list: list[str],
) -> int:
    """Compute overall confidence score rewarding supported claims and discounting inflated ones.

    Only claims with evidence_level == 'inflated' (not missing/weak) are
    penalised — missing skills are job-fit gaps, not credibility issues.

    Increased compatibility coefficient (0.75 vs prior 0.60) so strong
    candidates reach 70-90 range.
    """
    truly_inflated = _truly_inflated(inflated_claims)
    return round(
        max(
            0,
            min(
                100,
                (compatibility * 0.75)
                + (len(verified_claims) * 1.8)
                + (len(action_verbs_list) * 0.5)
                - (len(truly_inflated) * 3.5),
            ),
        )
    )


def compute_confidence_reason(
    compatibility: int,
    verified_claims: list[dict[str, Any]],
    inflated_claims: list[dict[str, Any]],
    action_verbs_list: list[str],
    demonstrated_exp_proj: int,
) -> str:
    """Generate a human-readable reason for the computed confidence score."""
    reasons: list[str] = []
    if compatibility >= 80:
        reasons.append("strong JD alignment")
    elif compatibility >= 50:
        reasons.append("moderate JD alignment")
    else:
        reasons.append("weak JD alignment")
    if verified_claims:
        reasons.append(f"{len(verified_claims)} verified claim(s)")
    else:
        reasons.append("no verified claims")
    if demonstrated_exp_proj > 0:
        reasons.append(f"{demonstrated_exp_proj} experience/project achievement(s) confirmed")
    truly_inflated = _truly_inflated(inflated_claims)
    if truly_inflated:
        reasons.append(f"{len(truly_inflated)} inflated claim(s) lowering trust")
    if not action_verbs_list:
        reasons.append("no action verbs detected")
    return "; ".join(reasons)


def readable_confidence_explanation(confidence: int) -> str:
    """Short explanation of what the confidence score means."""
    if confidence >= 80:
        return "High confidence — resume claims are consistently supported by experience and project evidence."
    if confidence >= 60:
        return "Moderate confidence — most key claims have supporting evidence; some gaps remain."
    return "Low confidence — several claims lack implementation evidence or JD alignment is weak."


def readable_risk_breakdown(
    compatibility: int,
    missing_skills_raw: list[str],
    inflated_count: int,
    consistency_count: int,
    has_action_verbs: bool,
) -> str:
    """Explain what contributed to the risk score."""
    factors: list[str] = []
    if compatibility < 50:
        factors.append("weak JD alignment")
    if missing_skills_raw:
        factors.append(f"{len(missing_skills_raw)} missing JD skill(s)")
    if inflated_count > 0:
        factors.append(f"{inflated_count} unsupported claim(s)")
    if consistency_count > 0:
        factors.append(f"{consistency_count} consistency concern(s)")
    if not has_action_verbs:
        factors.append("no action verbs detected")
    if not factors:
        return "No risk factors identified — resume is well-aligned and supported."
    return "Risk factors: " + "; ".join(factors) + "."


def aggregate_findings(
    findings: list[dict[str, str]],
    consistency_findings: list[dict[str, Any]],
    needs_fallback_message: bool,
) -> list[dict[str, str]]:
    """Merge consistency findings into the main findings list and ensure minimum findings count."""
    if needs_fallback_message and len(findings) < 2:
        findings.insert(
            0,
            {"message": "Structured section parse completed; each claim uses sentence-level snippets.", "severity": "low"},
        )

    for item in consistency_findings[:8]:
        if item.get("status") == "buzzword":
            findings.append({"message": str(item["claim"]), "severity": "medium"})
        elif item.get("status") in ("inflated", "weak"):
            findings.append(
                {"message": str(item["claim"]), "severity": "medium"}
            )

    return findings
