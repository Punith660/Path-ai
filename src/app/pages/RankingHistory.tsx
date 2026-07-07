import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { API_BASE_URL } from '../context/VerificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Trophy, History, Eye, ChevronDown, ChevronUp, Trash2, X, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';

type RankingSummary = {
  id: number;
  job_id: number;
  job_description: string;
  strictness: string;
  candidate_count: number;
  created_at: string;
};

type RankedCandidate = {
  candidate_name: string;
  rank_score: number;
  compatibility: number;
  confidence: number;
  risk: number;
  ranking_candidate_id?: number;
};

type RankingDetail = {
  id: number;
  job_id: number;
  job_description: string;
  strictness: string;
  cross_reference_sync: boolean;
  candidates: RankedCandidate[];
  created_at: string;
};

export default function RankingHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<RankingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, RankingDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<number | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<RankingSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
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
        const endpoint = API_BASE_URL ? `${API_BASE_URL}/rankings` : '/rankings';
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('pathai_token');
          throw new Error('Your session has expired or the token is invalid. Please log in again.');
        }

        if (!response.ok) throw new Error('Failed to load ranking history.');
        const data = (await response.json()) as RankingSummary[];
        setSessions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  async function toggleExpand(sessionId: number) {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sessionId);

    // Load detail if not cached
    if (!detailCache[sessionId]) {
      setLoadingDetail(sessionId);
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('access_token') || 
                    localStorage.getItem('auth_token') || 
                    localStorage.getItem('pathai_token');
      if (!token) {
        setError('Authentication token is missing. Please log in first.');
        setLoadingDetail(null);
        return;
      }

      try {
        const endpoint = API_BASE_URL
          ? `${API_BASE_URL}/rankings/${sessionId}`
          : `/rankings/${sessionId}`;
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('pathai_token');
          setError('Your session has expired or the token is invalid. Please log in again.');
          throw new Error('Your session has expired or the token is invalid. Please log in again.');
        }

        if (!response.ok) throw new Error('Failed to load ranking details.');
        const data = (await response.json()) as RankingDetail;
        setDetailCache((prev) => ({ ...prev, [sessionId]: data }));
      } catch {
        // Silently fail — user can retry by collapsing/expanding
      } finally {
        setLoadingDetail(null);
      }
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, session: RankingSummary) => {
    e.stopPropagation();
    setDeleteTarget(session);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);

    const token = localStorage.getItem('token') || 
                  localStorage.getItem('access_token') || 
                  localStorage.getItem('auth_token') || 
                  localStorage.getItem('pathai_token');
    if (!token) {
      setDeleteError('Authentication token is missing. Please log in first.');
      setDeleteLoading(false);
      return;
    }

    try {
      const endpoint = API_BASE_URL
        ? `${API_BASE_URL}/rankings/${deleteTarget.id}`
        : `/rankings/${deleteTarget.id}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 403) {
        throw new Error('You do not have permission to delete this ranking session.');
      }
      if (response.status === 404) {
        throw new Error('Ranking session not found. It may have already been deleted.');
      }
      if (!response.ok) {
        throw new Error('Failed to delete ranking session.');
      }

      // Remove from UI
      setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDetailCache((prev) => {
        const updated = { ...prev };
        delete updated[deleteTarget.id];
        return updated;
      });
      if (expandedId === deleteTarget.id) {
        setExpandedId(null);
      }
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  function formatScore(value: number): string {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-electric-blue shrink-0" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Ranking History</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View previous candidate ranking sessions stored in the database.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-muted-foreground text-sm">Loading ranking history...</div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && sessions.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Trophy className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No ranking sessions found.</p>
            <p className="text-xs mt-1">
              Run a ranking from the{' '}
              <button
                onClick={() => navigate('/rank')}
                className="text-electric-blue hover:underline"
              >
                Candidate Ranking
              </button>{' '}
              page to see it here.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isExpanded = expandedId === session.id;
            const detail = detailCache[session.id];

            return (
              <Card key={session.id} className="overflow-hidden">
                <div
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 md:px-6 py-4 cursor-pointer hover:bg-secondary/30 transition-colors gap-2"
                  onClick={() => toggleExpand(session.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        #{session.id}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {session.strictness}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {session.candidate_count} candidate{session.candidate_count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium truncate">
                      {session.job_description || 'No job description saved'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(session.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(session);
                        setDeleteError(null);
                      }}
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      title="Delete ranking session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(session.id);
                      }}
                      className="text-muted-foreground"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 md:px-6 py-4">
                    {loadingDetail === session.id ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        Loading details...
                      </div>
                    ) : detail ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Strictness:</span>{' '}
                            <span className="font-medium capitalize">{detail.strictness}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cross-reference:</span>{' '}
                            <span className="font-medium">
                              {detail.cross_reference_sync ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm min-w-[500px]">
                            <thead className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-secondary/40">
                              <tr>
                                <th className="px-3 py-2 w-10">#</th>
                                <th className="px-3 py-2">Candidate</th>
                                <th className="px-3 py-2 text-right">Score</th>
                                <th className="px-3 py-2 text-right">Compat.</th>
                                <th className="px-3 py-2 text-right">Conf.</th>
                                <th className="px-3 py-2 text-right">Risk</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {detail.candidates.map((c, idx) => (
                                <tr
                                  key={c.candidate_name}
                                  className="hover:bg-secondary/30 cursor-pointer"
                                  onClick={() => {
                                    const candidateId = c.ranking_candidate_id || (idx + 1);
                                    navigate(`/rankings/${session.id}/candidates/${candidateId}`);
                                  }}
                                >
                                  <td className="px-3 py-2 font-bold text-xs whitespace-nowrap">{idx + 1}</td>
                                  <td className="px-3 py-2 font-medium whitespace-nowrap">{c.candidate_name}</td>
                                  <td className="px-3 py-2 text-right font-bold whitespace-nowrap">
                                    {formatScore(c.rank_score)}
                                  </td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">{formatScore(c.compatibility)}</td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">{formatScore(c.confidence)}</td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">{formatScore(c.risk)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2 text-center">
                        Could not load details. Click to retry.
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Delete Ranking Session</h3>
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Cancel deletion"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete ranking session{' '}
                <span className="font-semibold text-foreground">#{deleteTarget.id}</span>?
              </p>
              {deleteTarget.job_description && (
                <p className="text-xs text-muted-foreground">
                  Job: {deleteTarget.job_description.length > 100
                    ? deleteTarget.job_description.substring(0, 100) + '...'
                    : deleteTarget.job_description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                This action cannot be undone. The ranking session and all its candidate data will be permanently removed from the server.
              </p>

              {deleteError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/20">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-background text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>Deleting…</>
                ) : (
                  <>Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}