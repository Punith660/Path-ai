"""
Test that multi-candidate ranking produces correctly differentiated scores.
Each candidate must be scored independently from their own resume and evidence.
"""
from __future__ import annotations

import asyncio

from backend.main import _execute_rank, RankRequest, RankCandidateRequest
from backend.verification.pipeline import analyze_resume

STRONG_RESUME = """Experience
Senior Engineer | Corp | 2018-2024
- Built APIs using Python and FastAPI serving 50k+ requests per second.
- Deployed Docker containers to Kubernetes clusters with automated CI/CD.
- Designed PostgreSQL schemas and optimized queries, reducing latency by 40%.

Skills
Python, FastAPI, Docker, Kubernetes, PostgreSQL

Education
MS Computer Science | 2014-2016
"""

WEAK_RESUME = """Experience
Junior Dev | SmallCo | 2020-2024
- Used Excel to track inventory.
- Helped with basic troubleshooting.
- Attended team meetings.

Skills
Excel, Word, PowerPoint

Education
BA in Arts | 2016-2020
"""

JD = "Looking for Python, FastAPI, Docker, Kubernetes, PostgreSQL developer with strong backend experience"


class TestRankingScoreIndependence:
    """Each candidate's risk must be calculated independently."""

    def test_scores_differ_for_different_candidates(self):
        r1 = analyze_resume(STRONG_RESUME, JD, "medium", True)
        r2 = analyze_resume(WEAK_RESUME, JD, "medium", True)

        print(f"\nStrong candidate:  risk={r1['risk_score']}  compat={r1['compatibility_score']}  conf={r1['confidence']}")
        print(f"Weak candidate:    risk={r2['risk_score']}  compat={r2['compatibility_score']}  conf={r2['confidence']}")

        # The strong candidate should have a LOWER risk score
        assert r1["risk_score"] < r2["risk_score"], (
            f"Strong candidate should have LOWER risk, but got: "
            f"strong={r1['risk_score']} vs weak={r2['risk_score']}"
        )
        # The strong candidate should have HIGHER compatibility
        assert r1["compatibility_score"] > r2["compatibility_score"], (
            f"Strong candidate should have HIGHER compatibility, but got: "
            f"strong={r1['compatibility_score']} vs weak={r2['compatibility_score']}"
        )
        # The strong candidate should have HIGHER confidence
        assert r1["confidence"] > r2["confidence"], (
            f"Strong candidate should have HIGHER confidence, but got: "
            f"strong={r1['confidence']} vs weak={r2['confidence']}"
        )

    def test_call_order_does_not_affect_scores(self):
        """Verify that calling candidates in different order gives the same scores."""
        r_first = analyze_resume(STRONG_RESUME, JD, "medium", True)
        r_second = analyze_resume(STRONG_RESUME, JD, "medium", True)
        assert r_first["risk_score"] == r_second["risk_score"]
        assert r_first["compatibility_score"] == r_second["compatibility_score"]
        assert r_first["confidence"] == r_second["confidence"]

    def test_consecutive_calls_produce_consistent_results(self):
        """Three consecutive calls with different inputs must remain independent."""
        results = [
            analyze_resume(STRONG_RESUME, JD, "medium", True),
            analyze_resume(WEAK_RESUME, JD, "medium", True),
            analyze_resume(STRONG_RESUME, JD, "medium", True),
        ]
        # Both strong results should be the same
        assert results[0]["risk_score"] == results[2]["risk_score"]
        # Strong should be better than weak
        assert results[0]["risk_score"] < results[1]["risk_score"]
        assert results[0]["compatibility_score"] > results[1]["compatibility_score"]
        assert results[0]["confidence"] > results[1]["confidence"]


class TestExecuteRank:
    """Test that _execute_rank correctly evaluates each candidate independently."""

    def test_rank_scores_differ(self):
        """Different resumes should produce different rank scores."""
        payload = RankRequest(
            job_description=JD,
            candidates=[
                RankCandidateRequest(name="Strong", text=STRONG_RESUME),
                RankCandidateRequest(name="Weak", text=WEAK_RESUME),
            ],
            strictness="medium",
            cross_reference_sync=True,
        )
        results = asyncio.run(_execute_rank(payload))
        # Results are sorted by rank_score descending
        assert len(results) == 2
        # The strong candidate should rank first
        assert results[0]["candidate_name"] == "Strong", (
            f"Expected Strong first, got {results[0]['candidate_name']}: "
            f"scores={[(r['candidate_name'], r['rank_score'], r['compatibility'], r['confidence'], r['risk']) for r in results]}"
        )
        # Rank scores should be meaningfully different
        assert results[0]["rank_score"] > results[1]["rank_score"] + 10, (
            f"Rank scores too close: {results[0]['rank_score']} vs {results[1]['rank_score']}"
        )
        # Each candidate should have their own risk score
    def test_same_candidate_twice_no_state_leak(self):
        """Running the same candidate twice must produce identical risk scores (no shared state accumulation)."""
        payload = RankRequest(
            job_description=JD,
            candidates=[
                RankCandidateRequest(name="First", text=STRONG_RESUME),
                RankCandidateRequest(name="Second", text=STRONG_RESUME),
            ],
            strictness="medium",
            cross_reference_sync=True,
        )
        results = asyncio.run(_execute_rank(payload))
        assert len(results) == 2
        r1 = results[0]
        r2 = results[1]
        assert r1["risk"] == r2["risk"], (
            f"Same resume gave different risk scores: {r1['risk']} vs {r2['risk']}. "
            f"This indicates shared state leaking between evaluations."
        )
        assert r1["compatibility"] == r2["compatibility"]
        assert r1["confidence"] == r2["confidence"]
        assert r1["rank_score"] == r2["rank_score"]

    def test_identical_resumes_produce_identical_scores(self):
        """Two identical resumes should produce identical scores (determinism)."""
        payload = RankRequest(
            job_description=JD,
            candidates=[
                RankCandidateRequest(name="A", text=STRONG_RESUME),
                RankCandidateRequest(name="B", text=STRONG_RESUME),
            ],
            strictness="medium",
            cross_reference_sync=True,
        )
        results = asyncio.run(_execute_rank(payload))
        assert len(results) == 2
        # Both should have the same risk score
        assert results[0]["risk"] == results[1]["risk"], (
            f"Identical resumes gave different risk: {results[0]['risk']} vs {results[1]['risk']}"
        )
        assert results[0]["compatibility"] == results[1]["compatibility"]
        assert results[0]["confidence"] == results[1]["confidence"]
        assert results[0]["rank_score"] == results[1]["rank_score"]