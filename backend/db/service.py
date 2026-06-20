"""
Database service layer for persistence MVP.

Provides functions to save ranking sessions and retrieve ranking history.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.db.models import Candidate, Job, Ranking, RankingCandidate


def save_ranking_session(
    db: Session,
    job_description: str,
    strictness: str,
    cross_reference_sync: bool,
    results: list[dict[str, object]],
) -> Ranking:
    """Save a ranking session (job + candidates + results) and return the Ranking row."""
    # 1. Create or skip duplicate detection — always insert new rows
    job = Job(
        description=job_description,
        strictness=strictness,
        cross_reference_sync=1 if cross_reference_sync else 0,
    )
    db.add(job)
    db.flush()  # get job.id

    ranking = Ranking(job_id=job.id)
    db.add(ranking)
    db.flush()  # get ranking.id

    for result in results:
        name = str(result.get("candidate_name", "Unknown"))
        text = str(result.get("_resume_text", ""))

        candidate = Candidate(name=name, text=text)
        db.add(candidate)
        db.flush()  # get candidate.id

        rc = RankingCandidate(
            ranking_id=ranking.id,
            candidate_id=candidate.id,
            rank_score=float(result.get("rank_score", 0.0)),
            compatibility=float(result.get("compatibility", 0.0)),
            confidence=float(result.get("confidence", 0.0)),
            risk=float(result.get("risk", 0.0)),
        )
        db.add(rc)

    db.commit()
    db.refresh(ranking)
    return ranking


def get_ranking_history(db: Session, limit: int = 50) -> list[dict]:
    """Return the most recent ranking sessions (summary only)."""
    rankings = (
        db.query(Ranking)
        .order_by(Ranking.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for r in rankings:
        result.append({
            "id": r.id,
            "job_id": r.job_id,
            "job_description": r.job.description[:200] if r.job else "",
            "strictness": r.job.strictness if r.job else "medium",
            "candidate_count": len(r.candidate_results),
            "created_at": r.created_at.isoformat() if r.created_at else "",
        })
    return result


def get_ranking_detail(db: Session, ranking_id: int) -> dict | None:
    """Return a single ranking session with full candidate results."""
    ranking = db.query(Ranking).filter(Ranking.id == ranking_id).first()
    if not ranking:
        return None

    candidates = []
    for rc in ranking.candidate_results:
        candidates.append({
            "candidate_name": rc.candidate.name if rc.candidate else "Unknown",
            "rank_score": rc.rank_score,
            "compatibility": rc.compatibility,
            "confidence": rc.confidence,
            "risk": rc.risk,
        })

    return {
        "id": ranking.id,
        "job_id": ranking.job_id,
        "job_description": ranking.job.description if ranking.job else "",
        "strictness": ranking.job.strictness if ranking.job else "medium",
        "cross_reference_sync": bool(ranking.job.cross_reference_sync) if ranking.job else True,
        "candidates": candidates,
        "created_at": ranking.created_at.isoformat() if ranking.created_at else "",
    }