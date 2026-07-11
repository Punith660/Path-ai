"""
Database service layer for persisted verification reports.

Provides functions to save, list, and delete reports owned by a user.
"""

from __future__ import annotations

import json
import datetime
from typing import Any

from sqlalchemy.orm import Session

from backend.db.models import Report, User


def save_report(
    db: Session,
    user_id: int,
    candidate_name: str,
    job_description: str,
    risk_score: int,
    confidence: int,
    compatibility_score: int,
    verdict: str,
    strictness: str,
    cross_reference_sync: bool,
    analysis_data: dict[str, Any] | None = None,
) -> Report:
    """Persist a verification report to the database."""
    report = Report(
        user_id=user_id,
        candidate_name=candidate_name,
        job_description=job_description,
        risk_score=risk_score,
        confidence=confidence,
        compatibility_score=compatibility_score,
        verdict=verdict,
        strictness=strictness,
        cross_reference_sync=1 if cross_reference_sync else 0,
        analysis_data=json.dumps(analysis_data) if analysis_data else None,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def get_user_reports(db: Session, user_id: int, limit: int = 100, offset: int = 0) -> list[Report]:
    """Return the most recent reports owned by the user."""
    return (
        db.query(Report)
        .filter(Report.user_id == user_id)
        .order_by(Report.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_report_by_id(db: Session, report_id: int, user_id: int) -> Report | None:
    """Return a report by its primary key, enforcing ownership."""
    return db.query(Report).filter(Report.id == report_id, Report.user_id == user_id).first()


def delete_report(db: Session, report_id: int, user_id: int) -> bool:
    """Delete a report row from the database, verifying ownership.
    
    Returns True if deleted, False if not found or not owned.
    """
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == user_id).first()
    if not report:
        return False
    db.delete(report)
    db.commit()
    return True


def report_to_dict(report: Report) -> dict[str, Any]:
    """Convert a Report ORM instance to a JSON-serializable dictionary."""
    return {
        "id": report.id,
        "user_id": report.user_id,
        "candidate_name": report.candidate_name,
        "job_description": report.job_description,
        "risk_score": report.risk_score,
        "confidence": report.confidence,
        "compatibility_score": report.compatibility_score,
        "verdict": report.verdict,
        "strictness": report.strictness,
        "cross_reference_sync": bool(report.cross_reference_sync),
        "analysis_data": json.loads(report.analysis_data) if report.analysis_data else None,
        "created_at": report.created_at.isoformat() if report.created_at else "",
    }