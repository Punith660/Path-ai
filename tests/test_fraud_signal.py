"""Tests for backend/signals/fraud_signal.py — risk score, confidence, findings, weak areas."""
from __future__ import annotations

from backend.signals.fraud_signal import (
    _truly_inflated,
    aggregate_findings,
    categorize_claims,
    compute_confidence,
    compute_initial_findings,
    compute_risk_score,
    compute_weak_areas,
)


# ── _truly_inflated ─────────────────────────────────────────────────────────

class TestTrulyInflated:
    def test_filters_to_evidence_level_inflated_only(self):
        claims = [
            {"evidence_level": "inflated", "skill": "React"},
            {"evidence_level": "missing", "skill": "K8s"},
            {"evidence_level": "weak", "skill": "Docker"},
            {"evidence_level": "demonstrated", "skill": "Python"},
        ]
        result = _truly_inflated(claims)
        assert len(result) == 1
        assert result[0]["skill"] == "React"

    def test_empty_when_no_inflated(self):
        assert _truly_inflated([{"evidence_level": "missing"}]) == []
        assert _truly_inflated([{"evidence_level": "weak"}]) == []
        assert _truly_inflated([]) == []

    def test_only_inflated_survives(self):
        claims = [{"evidence_level": "inflated"}] * 3 + [{"evidence_level": "missing"}] * 5
        assert len(_truly_inflated(claims)) == 3


# ── categorize_claims ──────────────────────────────────────────────────────

class TestCategorizeClaims:
    def test_inflated_contains_weak_and_missing(self):
        claims = [
            {"evidence_level": "demonstrated", "status": "demonstrated"},
            {"evidence_level": "weak", "status": "weak"},
            {"evidence_level": "missing", "status": "missing"},
            {"evidence_level": "supported", "status": "supported"},
        ]
        inflated, verified = categorize_claims(claims)
        assert len(inflated) == 2  # weak + missing
        assert len(verified) == 2  # demonstrated + supported

    def test_all_verified(self):
        claims = [
            {"evidence_level": "demonstrated", "status": "demonstrated"},
            {"evidence_level": "supported", "status": "supported"},
        ]
        inflated, verified = categorize_claims(claims)
        assert len(inflated) == 0
        assert len(verified) == 2

    def test_all_inflated(self):
        claims = [
            {"evidence_level": "weak", "status": "weak"},
            {"evidence_level": "missing", "status": "missing"},
            {"evidence_level": "inflated", "status": "inflated"},
        ]
        inflated, verified = categorize_claims(claims)
        assert len(inflated) == 3
        assert len(verified) == 0

    def test_inflated_also_categorized_as_inflated(self):
        """inflated evidence_level should be in the inflated bucket."""
        claims = [
            {"evidence_level": "inflated", "status": "inflated"},
        ]
        inflated, verified = categorize_claims(claims)
        assert len(inflated) == 1
        assert len(verified) == 0


# ── compute_weak_areas ─────────────────────────────────────────────────────

class TestComputeWeakAreas:
    def test_missing_skills_included(self):
        areas = compute_weak_areas(["Kubernetes", "Docker"], ["built"], [])
        assert any("Missing JD skills" in a for a in areas)

    def test_no_action_verbs_included(self):
        areas = compute_weak_areas([], [], [])
        assert any("action verbs" in a.lower() for a in areas)

    def test_weak_claims_counted(self):
        claims = [{"evidence_level": "weak"}, {"evidence_level": "inflated"}]
        areas = compute_weak_areas([], ["built"], claims)
        assert any("claim(s)" in a and "light" in a for a in areas)

    def test_no_issues_empty_list(self):
        claims = [{"evidence_level": "demonstrated"}]
        areas = compute_weak_areas([], ["built"], claims)
        assert len(areas) == 0


# ── compute_initial_findings ───────────────────────────────────────────────

class TestComputeInitialFindings:
    def test_missing_skills_finding_medium(self):
        findings = compute_initial_findings(["Docker"], ["built"])
        assert any(f["severity"] == "medium" for f in findings)

    def test_no_action_verbs_medium_severity(self):
        findings = compute_initial_findings([], [])
        assert any("action verbs" in f["message"].lower() for f in findings)

    def test_action_verbs_finding_low_severity(self):
        findings = compute_initial_findings([], ["architected", "deployed"])
        low = [f for f in findings if f["severity"] == "low"]
        assert any("action verbs" in f["message"].lower() for f in low)

    def test_empty_inputs_minimal_findings(self):
        findings = compute_initial_findings([], ["built"])
        # only low severity verb finding, no missing skills
        assert len(findings) >= 1


# ── compute_risk_score ─────────────────────────────────────────────────────

class TestComputeRiskScore:
    def test_low_risk_at_high_compatibility(self):
        score = compute_risk_score(
            compatibility=95,
            inflated_claims=[],
            missing_skills_raw=[],
            action_verbs_list=["built"],
            consistency_findings=[],
            strictness="medium",
            cross_reference_sync=False,
        )
        assert 0 <= score <= 20

    def test_missing_skills_do_not_raise_risk(self):
        """Missing JD skills are job-fit gaps; they should NOT inflate risk."""
        score = compute_risk_score(
            compatibility=30,
            inflated_claims=[{"type": "skill", "evidence_level": "missing"}] * 8,
            missing_skills_raw=["K8s", "Docker", "Terraform", "AWS"],
            action_verbs_list=["built"],
            consistency_findings=[{"status": "missing"}] * 8,
            strictness="medium",
            cross_reference_sync=True,
        )
        # No truly inflated claims, no buzzword/stuffing findings → risk stays low
        assert score <= 10

    def test_high_risk_with_truly_inflated_claims(self):
        """Only claims with evidence_level=='inflated' drive risk."""
        score = compute_risk_score(
            compatibility=30,
            inflated_claims=[{"type": "skill", "evidence_level": "inflated"},
                             {"type": "skill", "evidence_level": "inflated"}],
            missing_skills_raw=["K8s", "Docker", "Terraform", "AWS"],
            action_verbs_list=[],
            consistency_findings=[{"status": "inflated"}, {"status": "inflated"}],
            strictness="high",
            cross_reference_sync=True,
        )
        # 2*24 (high penalty) + min(40, 2*8) + 10 (no verbs) = 48 + 16 + 10 = 74
        assert score >= 60

    def test_score_clamped_to_100(self):
        score = compute_risk_score(
            compatibility=0,
            inflated_claims=[{"type": "skill", "evidence_level": "inflated"}] * 50,
            missing_skills_raw=["A"] * 50,
            action_verbs_list=[],
            consistency_findings=[{"status": "inflated"}] * 10,
            strictness="high",
            cross_reference_sync=True,
        )
        assert score == 100

    def test_score_at_least_zero(self):
        score = compute_risk_score(
            compatibility=100,
            inflated_claims=[],
            missing_skills_raw=[],
            action_verbs_list=["built", "deployed", "tested"],
            consistency_findings=[],
            strictness="low",
            cross_reference_sync=False,
        )
        assert score >= 0

    def test_clean_resume_risk_0_to_20(self):
        """Clean resumes with no inflated claims → risk 0-20."""
        score = compute_risk_score(
            compatibility=85,
            inflated_claims=[],
            missing_skills_raw=["K8s", "Docker"],
            action_verbs_list=["built", "deployed", "tested"],
            consistency_findings=[],
            strictness="medium",
            cross_reference_sync=True,
        )
        assert 0 <= score <= 20

    def test_inflated_claims_increase_risk(self):
        """Inflated claims should push risk up."""
        score = compute_risk_score(
            compatibility=80,
            inflated_claims=[{"type": "skill", "evidence_level": "inflated", "skill": "FakeSkill"}],
            missing_skills_raw=[],
            action_verbs_list=["built"],
            consistency_findings=[],
            strictness="medium",
            cross_reference_sync=False,
        )
        assert score >= 10  # 1*14 = 14


# ── compute_confidence ─────────────────────────────────────────────────────

class TestComputeConfidence:
    def test_high_confidence_with_many_verified_claims(self):
        conf = compute_confidence(
            compatibility=90,
            verified_claims=[{"skill": "A"}, {"skill": "B"}, {"skill": "C"}, {"skill": "D"}],
            inflated_claims=[],
            action_verbs_list=["built", "tested"],
        )
        # 90*0.75 + 4*1.8 + 2*0.5 = 67.5 + 7.2 + 1.0 = 75.7
        # Strong candidates should reach 70+ — high end
        assert 70 <= conf <= 90

    def test_low_confidence_with_few_verified(self):
        conf = compute_confidence(
            compatibility=20,
            verified_claims=[],
            inflated_claims=[{"skill": "X", "evidence_level": "inflated"},
                             {"skill": "Y", "evidence_level": "inflated"},
                             {"skill": "Z", "evidence_level": "inflated"}],
            action_verbs_list=[],
        )
        # 20*0.75 - 3*3.5 = 15 - 10.5 = 4.5
        assert conf <= 40

    def test_confidence_in_0_100_range(self):
        conf = compute_confidence(
            compatibility=50,
            verified_claims=[{"skill": "A"}],
            inflated_claims=[{"skill": "B", "evidence_level": "inflated"}],
            action_verbs_list=["built"],
        )
        # 50*0.75 + 1*1.8 + 1*0.5 - 1*3.5 = 37.5 + 1.8 + 0.5 - 3.5 = 36.3
        assert 0 <= conf <= 100

    def test_confidence_clamped_bottom(self):
        conf = compute_confidence(
            compatibility=0,
            verified_claims=[],
            inflated_claims=[{"skill": "X", "evidence_level": "inflated"}] * 10,
            action_verbs_list=[],
        )
        # Should not go below 0
        assert conf >= 0

    def test_missing_claims_dont_punish_confidence(self):
        """Missing evidence_level claims (job-fit gaps) should not reduce confidence."""
        conf = compute_confidence(
            compatibility=75,
            verified_claims=[{"skill": "Python", "evidence_level": "demonstrated"}],
            inflated_claims=[{"skill": "K8s", "evidence_level": "missing"},
                             {"skill": "Docker", "evidence_level": "missing"}],
            action_verbs_list=["built", "deployed"],
        )
        # 75*0.75 + 1*1.8 + 2*0.5 - 0*3.5 = 56.25 + 1.8 + 1.0 = 59.05
        assert conf >= 55

    def test_strong_resume_reaches_70_90(self):
        """Strong candidates should score confidence 70-90."""
        conf = compute_confidence(
            compatibility=85,
            verified_claims=[{"skill": "A"}, {"skill": "B"}, {"skill": "C"},
                             {"skill": "D"}, {"skill": "E"}],
            inflated_claims=[{"skill": "Fake", "evidence_level": "inflated"}],
            action_verbs_list=["built", "deployed", "tested", "architected", "designed"],
        )
        # 85*0.75 + 5*1.8 + 5*0.5 - 1*3.5 = 63.75 + 9.0 + 2.5 - 3.5 = 71.75
        assert 70 <= conf <= 90


# ── aggregate_findings ─────────────────────────────────────────────────────

class TestAggregateFindings:
    def test_fallback_message_added_when_few_findings(self):
        findings = [{"message": "A", "severity": "low"}]
        merged = aggregate_findings(findings, [], needs_fallback_message=True)
        assert len(merged) > 1

    def test_fallback_skipped_when_enough_findings(self):
        findings = [
            {"message": "A", "severity": "low"},
            {"message": "B", "severity": "medium"},
        ]
        merged = aggregate_findings(findings, [], needs_fallback_message=True)
        assert len(merged) == 2  # no new insertion

    def test_buzzword_findings_included(self):
        findings = []
        consistency = [{"status": "buzzword", "claim": "used 'ninja' in resume"}]
        merged = aggregate_findings(findings, consistency, needs_fallback_message=False)
        assert any("ninja" in f["message"] for f in merged)

    def test_inflated_consistency_medium_severity(self):
        findings = []
        consistency = [{"status": "inflated", "claim": "Kubernetes inflated"}]
        merged = aggregate_findings(findings, consistency, needs_fallback_message=False)
        mid = [f for f in merged if f["severity"] == "medium"]
        assert len(mid) >= 1

    def test_at_most_8_consistency_findings(self):
        consistency = [{"status": "buzzword", "claim": f"buzzword {i}"} for i in range(20)]
        merged = aggregate_findings([], consistency, needs_fallback_message=False)
        # count buzzword claims added
        buzz_in_merged = sum(1 for f in merged if "buzzword" in f["message"])
        assert buzz_in_merged <= 8
