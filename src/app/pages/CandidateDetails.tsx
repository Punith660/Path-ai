import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { API_BASE_URL } from '../context/VerificationContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Trophy, AlertTriangle, CheckCircle, HelpCircle, FileText, User, Briefcase, TrendingUp, Shield, Star, Clock, Lightbulb } from 'lucide-react';

type CandidateDetailData = {
  ranking_id: number;
  candidate_name: string;
  rank_score: number;
  compatibility: number;
  confidence: number;
  risk: number;
  job_description: string;
  strictness: string;
  cross_reference_sync: boolean;
  resume_text: string;
  analysis_data: {
    skills: string[];
    action_verbs: string[];
    matched_skills: string[];
    missing_skills: string[];
    weak_areas: string[];
    findings: { message: string; severity: string }[];
    timeline: { start_year: number; end_year: number | 'present'; evidence?: string }[];
    timeline_analysis: { overlaps?: string[]; gaps?: string[]; suspicious_inflation?: string[] };
    evidence: Record<string, any>;
    claims: any[];
    consistency_findings: any[];
    job_requirements: any;
    executive_summary?: string;
    risk_summary?: string;
    confidence_explanation?: string;
    risk_breakdown?: string;
    positive_evidence_summary?: string[];
    confidence_reason?: string;
    years_experience?: number;
    resume_sections?: Record<string, string>;
    skill_timeline_insights?: { skill: string; first_seen: string | null; experience_years_estimate: number | null }[];
  } | null;
};

type AnalysisData = NonNullable<CandidateDetailData['analysis_data']>;
type TimelineEntry = AnalysisData['timeline'][number] & Record<string, any>;

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function textFromFinding(finding: unknown): string {
  if (typeof finding === 'string') return finding;
  if (finding && typeof finding === 'object') {
    const item = finding as Record<string, unknown>;
    return String(item.message || item.text || item.description || item.finding || '');
  }
  return '';
}

function severityFromFinding(finding: unknown): string {
  if (finding && typeof finding === 'object') {
    const severity = (finding as Record<string, unknown>).severity;
    return typeof severity === 'string' ? severity : 'low';
  }
  return 'low';
}

function getTimelineStart(entry: TimelineEntry): string {
  return String(entry.start_year ?? entry.start ?? entry.from ?? entry.year ?? 'Unknown');
}

function getTimelineEnd(entry: TimelineEntry): string {
  const value = entry.end_year ?? entry.end ?? entry.to ?? entry.current;
  if (value === true || value === 'present') return 'Present';
  return String(value ?? 'Present');
}

function getTimelineEvidence(entry: TimelineEntry): string {
  return String(entry.evidence || entry.role || entry.title || entry.company || entry.description || '');
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function getRiskBadge(riskScore: number) {
  if (riskScore >= 70) return { label: 'High Risk', variant: 'destructive' as const, icon: AlertTriangle };
  if (riskScore >= 35) return { label: 'Needs Review', variant: 'secondary' as const, icon: HelpCircle };
  return { label: 'Likely Consistent', variant: 'default' as const, icon: CheckCircle };
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case 'high': return 'destructive' as const;
    case 'medium': return 'secondary' as const;
    default: return 'outline' as const;
  }
}

export default function CandidateDetails() {
  const { rankingId, candidateId } = useParams<{ rankingId: string; candidateId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CandidateDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      if (!rankingId || !candidateId) {
        setError('Missing ranking or candidate ID.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token') || 
                    localStorage.getItem('access_token') || 
                    localStorage.getItem('auth_token') || 
                    localStorage.getItem('pathai_token');
      if (!token) {
        setError('Authentication token is missing. Please log in first.');
        setLoading(false);
        return;
      }

      try {
        const endpoint = API_BASE_URL
          ? `${API_BASE_URL}/rankings/${rankingId}/candidates/${candidateId}`
          : `/rankings/${rankingId}/candidates/${candidateId}`;
        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('pathai_token');
          throw new Error('Your session has expired or the token is invalid. Please log in again.');
        }

        if (response.status === 404) {
          throw new Error('Candidate details not found.');
        }

        if (!response.ok) throw new Error('Failed to load candidate details.');
        const result = (await response.json()) as CandidateDetailData;
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [rankingId, candidateId]);

  const analysis = data?.analysis_data;
  const matchedSkills = asArray<string>(analysis?.matched_skills);
  const missingSkills = asArray<string>(analysis?.missing_skills);
  const extractedSkills = asArray<string>(analysis?.skills);
  const actionVerbs = asArray<string>(analysis?.action_verbs);
  const weakAreas = asArray<string>(analysis?.weak_areas);
  const findings = asArray(analysis?.findings).filter((finding) => textFromFinding(finding));
  const timeline = asArray<TimelineEntry>(analysis?.timeline).map((entry) => ({
    ...entry,
    start_year: getTimelineStart(entry),
    end_year: getTimelineEnd(entry),
    evidence: getTimelineEvidence(entry),
  }));
  const evidenceEntries = analysis?.evidence && typeof analysis.evidence === 'object'
    ? Object.entries(analysis.evidence)
    : [];
  const consistencyFindings = asArray(analysis?.consistency_findings).filter((finding) => textFromFinding(finding));
  const recommendationItems = [
    analysis?.risk_summary,
    analysis?.confidence_reason,
    analysis?.risk_breakdown,
    analysis?.confidence_explanation,
  ].filter(Boolean);
  const riskBadge = data ? getRiskBadge(data.risk) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Ranking
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {data?.candidate_name || 'Candidate Details'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Detailed verification report for this candidate
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-muted-foreground text-sm">Loading candidate details...</div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                  Rank Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatScore(data.rank_score)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-blue-500" />
                  Compatibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatScore(data.compatibility)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-green-500" />
                  Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatScore(data.confidence)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatScore(data.risk)}%</div>
                {riskBadge && (
                  <Badge variant={riskBadge.variant} className="mt-1">
                    {riskBadge.label}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Explainability / Summary */}
          {analysis?.executive_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.executive_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Recommendation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendationItems.length === 0 && findings.length === 0 && weakAreas.length === 0 && (
                <p className="text-sm text-muted-foreground">No recommendation details available.</p>
              )}
              {analysis?.risk_summary && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Risk Summary</p>
                  <p className="text-sm">{analysis.risk_summary}</p>
                </div>
              )}
              {analysis?.confidence_reason && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Confidence Reason</p>
                  <p className="text-sm">{analysis.confidence_reason}</p>
                </div>
              )}
              {analysis?.risk_breakdown && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Risk Breakdown</p>
                  <p className="text-sm whitespace-pre-wrap">{analysis.risk_breakdown}</p>
                </div>
              )}
              {analysis?.confidence_explanation && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Confidence Explanation</p>
                  <p className="text-sm">{analysis.confidence_explanation}</p>
                </div>
              )}
              {recommendationItems.length === 0 && findings.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Key Findings</p>
                  <ul className="space-y-1">
                    {findings.slice(0, 3).map((finding, idx) => (
                      <li key={idx} className="text-sm">{textFromFinding(finding)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {weakAreas.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Weak Areas</p>
                  <p className="text-sm">{weakAreas.join(', ')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                Timeline Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeline.length > 0 ? (
                <div className="space-y-2">
                  {timeline.map((entry, idx) => (
                    <div key={idx} className="text-sm flex gap-2">
                      <span className="font-medium shrink-0">
                        {entry.start_year} – {entry.end_year === 'present' ? 'Present' : entry.end_year}
                      </span>
                      {entry.evidence && (
                        <span className="text-muted-foreground">— {entry.evidence}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No timeline entries available.</p>
              )}

              {analysis?.timeline_analysis && (
                <div className="space-y-2 mt-3 pt-3 border-t border-border">
                  {analysis.timeline_analysis.overlaps && analysis.timeline_analysis.overlaps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-500 mb-1">Overlaps</p>
                      {analysis.timeline_analysis.overlaps.map((msg, i) => (
                        <p key={i} className="text-sm text-muted-foreground">• {msg}</p>
                      ))}
                    </div>
                  )}
                  {analysis.timeline_analysis.gaps && analysis.timeline_analysis.gaps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-500 mb-1">Gaps</p>
                      {analysis.timeline_analysis.gaps.map((msg, i) => (
                        <p key={i} className="text-sm text-muted-foreground">• {msg}</p>
                      ))}
                    </div>
                  )}
                  {analysis.timeline_analysis.suspicious_inflation && analysis.timeline_analysis.suspicious_inflation.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-orange-500 mb-1">Suspicious Inflation</p>
                      {analysis.timeline_analysis.suspicious_inflation.map((msg, i) => (
                        <p key={i} className="text-sm text-muted-foreground">• {msg}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skill Credibility */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500" />
                Skill Credibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Matched Skills */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Matched Skills</p>
                {matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {matchedSkills.map((skill) => (
                      <Badge key={skill} variant="default" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No matched skills.</p>
                )}
              </div>

              {/* Missing Skills */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Missing Skills</p>
                {missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs text-muted-foreground">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No missing skills.</p>
                )}
              </div>

              {matchedSkills.length === 0 && extractedSkills.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Extracted Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedSkills.map((skill) => (
                      <Badge key={skill} variant="default" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {actionVerbs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Action Verbs</p>
                  <div className="flex flex-wrap gap-1.5">
                    {actionVerbs.map((verb) => (
                      <Badge key={verb} variant="outline" className="text-xs">
                        {verb}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak Areas */}
              {weakAreas.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Weak Areas</p>
                  <ul className="space-y-1">
                    {weakAreas.map((area, idx) => (
                      <li key={idx} className="text-sm text-destructive flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evidence / Findings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-500" />
                Evidence & Findings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {findings.length > 0 ? (
                findings.map((f, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Badge variant={getSeverityBadge(severityFromFinding(f))} className="mt-0.5 shrink-0 text-[10px]">
                      {severityFromFinding(f)}
                    </Badge>
                    <p className="text-sm">{textFromFinding(f)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No findings available.</p>
              )}

              {consistencyFindings.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Consistency Findings</p>
                  <ul className="space-y-1">
                    {consistencyFindings.map((finding, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">{textFromFinding(finding)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evidenceEntries.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Evidence</p>
                  <div className="space-y-1">
                    {evidenceEntries.map(([key, value]) => (
                      <p key={key} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{key}:</span>{' '}
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Positive Evidence Summary */}
              {analysis?.positive_evidence_summary && analysis.positive_evidence_summary.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-green-600 mb-2">Positive Evidence</p>
                  <ul className="space-y-1">
                    {analysis.positive_evidence_summary.map((item, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resume Preview */}
          {data.resume_text && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  Resume Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap font-sans bg-muted/30 p-4 rounded-lg max-h-96 overflow-y-auto border border-border">
                  {data.resume_text}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Bottom Back Button */}
          <div className="flex justify-center pt-2 pb-6">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Ranking
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
