import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Loader2, Trophy, FileUp, X, FileText, Eye } from 'lucide-react';
import { API_BASE_URL } from '../context/VerificationContext';

type CandidateEntry = {
  name: string;
  text: string;
};

type RankedCandidate = {
  candidate_name: string;
  rank_score: number;
  compatibility: number;
  confidence: number;
  risk: number;
};

type RankResponse = {
  ranking_id: number | null;
  candidates: RankedCandidate[];
};

type RankingDetailCandidate = {
  candidate_name: string;
  rank_score: number;
  compatibility: number;
  confidence: number;
  risk: number;
  ranking_candidate_id: number;
};

type RankingDetail = {
  id: number;
  candidates: RankingDetailCandidate[];
};

type UploadedFile = {
  id: string;
  file: File;
  name: string;
};

function getRankBadge(rank: number) {
  if (rank === 1) return { label: '#1', variant: 'default' as const, icon: Trophy };
  if (rank === 2) return { label: '#2', variant: 'secondary' as const, icon: null };
  if (rank === 3) return { label: '#3', variant: 'outline' as const, icon: null };
  return { label: `#${rank}`, variant: 'outline' as const, icon: null };
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function deriveNameFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const name = withoutExt.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name) return filename;
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function RankCandidates() {
  const navigate = useNavigate();
  const [jobDescription, setJobDescription] = useState('');
  const [candidates, setCandidates] = useState<CandidateEntry[]>([
    { name: '', text: '' },
  ]);
  const [results, setResults] = useState<RankedCandidate[] | null>(null);
  const [rankingId, setRankingId] = useState<number | null>(null);
  const [candidateIds, setCandidateIds] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<'manual' | 'files'>('manual');

  function addCandidate() {
    setCandidates((prev) => [...prev, { name: '', text: '' }]);
  }

  function removeCandidate(index: number) {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCandidate(index: number, field: keyof CandidateEntry, value: string) {
    setCandidates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles: UploadedFile[] = Array.from(e.target.files).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: deriveNameFromFilename(file.name),
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  }

  function removeUploadedFile(id: string) {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function fetchRankingCandidateIds(rid: number, token: string) {
    try {
      const detailEndpoint = API_BASE_URL
        ? `${API_BASE_URL}/rankings/${rid}`
        : `/rankings/${rid}`;
      const detailResp = await fetch(detailEndpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (detailResp.ok) {
        const detail = (await detailResp.json()) as RankingDetail;
        const ids: Record<string, number> = {};
        for (const c of detail.candidates) {
          ids[c.candidate_name] = c.ranking_candidate_id;
        }
        setCandidateIds(ids);
      }
    } catch {
      // Non-critical — fall back to index-based navigation
    }
  }

  async function handleRankFiles() {
    if (!jobDescription.trim()) {
      setError('Job description is required.');
      return;
    }
    if (uploadedFiles.length < 2) {
      setError('Please upload at least 2 resume files to rank.');
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);
    setRankingId(null);

    const token = localStorage.getItem('token') || 
                  localStorage.getItem('access_token') || 
                  localStorage.getItem('auth_token') || 
                  localStorage.getItem('pathai_token');
    if (!token) {
      setError('Authentication token is missing. Please log in to perform candidate ranking.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('job_description', jobDescription);
      for (const uf of uploadedFiles) {
        formData.append('files', uf.file);
      }

      const endpoint = API_BASE_URL ? `${API_BASE_URL}/rank-files` : '/rank-files';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('pathai_token');
        throw new Error('Your session has expired or the token is invalid. Please log in again.');
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to rank candidates from files.');
      }

      const data = (await response.json()) as RankResponse;
      setResults(data.candidates);
      setRankingId(data.ranking_id);

      if (data.ranking_id) {
        await fetchRankingCandidateIds(data.ranking_id, token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRankText() {
    if (!jobDescription.trim()) {
      setError('Job description is required.');
      return;
    }
    const valid = candidates.filter((c) => c.name.trim() && c.text.trim());
    if (valid.length < 2) {
      setError('At least 2 candidates with name and resume text are required.');
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);
    setRankingId(null);

    const token = localStorage.getItem('token') || 
                  localStorage.getItem('access_token') || 
                  localStorage.getItem('auth_token') || 
                  localStorage.getItem('pathai_token');
    if (!token) {
      setError('Authentication token is missing. Please log in to perform candidate ranking.');
      setLoading(false);
      return;
    }

    try {
      const endpoint = API_BASE_URL ? `${API_BASE_URL}/rank` : '/rank';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          job_description: jobDescription,
          candidates: valid.map((c) => ({
            name: c.name,
            text: c.text,
          })),
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('pathai_token');
        throw new Error('Your session has expired or the token is invalid. Please log in again.');
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to rank candidates.');
      }

      const data = (await response.json()) as RankResponse;
      setResults(data.candidates);
      setRankingId(data.ranking_id);

      if (data.ranking_id) {
        await fetchRankingCandidateIds(data.ranking_id, token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  function handleRowClick(index: number) {
    if (!rankingId) return;
    const candidate = results?.[index];
    if (!candidate) return;

    // Use actual ranking_candidate_id if available, otherwise fall back to index + 1
    const candidateId = candidateIds[candidate.candidate_name] || (index + 1);
    const basePath = window.location.pathname.startsWith('/ranking-history') ? 'ranking-history' : 'rank';
    navigate(`/${basePath}/${rankingId}/candidate/${candidateId}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Candidate Ranking</h1>
        <p className="text-muted-foreground mt-1">
          Compare multiple candidates against a job description to find the best match.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={inputMode === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('manual')}
        >
          <Trophy className="h-4 w-4 mr-1" />
          Text Entry
        </Button>
        <Button
          variant={inputMode === 'files' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('files')}
        >
          <FileUp className="h-4 w-4 mr-1" />
          Upload Resumes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Description</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {inputMode === 'manual' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Candidates (Text Entry)</CardTitle>
            <Button variant="outline" size="sm" onClick={addCandidate}>
              + Add Candidate
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidates.map((candidate, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder={`Candidate ${index + 1} name`}
                    value={candidate.name}
                    onChange={(e) => updateCandidate(index, 'name', e.target.value)}
                  />
                  <Textarea
                    placeholder="Paste resume text..."
                    value={candidate.text}
                    onChange={(e) => updateCandidate(index, 'text', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                {candidates.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCandidate(index)}
                    className="text-destructive hover:text-destructive mt-1"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {inputMode === 'files' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Resumes (PDF / DOCX)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-border p-8 text-center transition-all hover:border-electric-blue/40 hover:bg-secondary/40"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFilesSelected}
                className="hidden"
                accept=".pdf,.docx"
                multiple
              />
              <FileUp className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-foreground">Click to select multiple resume files</p>
              <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX supported — select 2 or more files</p>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {uploadedFiles.length} file(s) selected
                </p>
                <div className="border rounded-lg divide-y">
                  {uploadedFiles.map((uf) => (
                    <div key={uf.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate font-medium">{uf.file.name}</span>
                        <span className="text-muted-foreground shrink-0">
                          → <span className="text-foreground">{uf.name}</span>
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUploadedFile(uf.id)}
                        className="text-destructive hover:text-destructive shrink-0 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        onClick={inputMode === 'files' ? handleRankFiles : handleRankText}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {inputMode === 'files' ? 'Extracting and ranking resumes...' : 'Ranking candidates...'}
          </>
        ) : (
          'Rank Candidates'
        )}
      </Button>

      {results && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranked Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead className="text-right">Rank Score</TableHead>
                  <TableHead className="text-right">Compatibility</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                  <TableHead className="w-24 text-center">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((candidate, index) => {
                  const rank = index + 1;
                  const badge = getRankBadge(rank);
                  const BadgeIcon = badge.icon;
                  return (
                    <TableRow
                      key={candidate.candidate_name}
                      className={rankingId ? 'cursor-pointer hover:bg-secondary/30' : ''}
                      onClick={() => handleRowClick(index)}
                    >
                      <TableCell>
                        <Badge variant={badge.variant as "default" | "secondary" | "outline"} className="flex items-center gap-1 w-fit">
                          {BadgeIcon && <BadgeIcon className="h-3 w-3" />}
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{candidate.candidate_name}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatScore(candidate.rank_score)}
                      </TableCell>
                      <TableCell className="text-right">{formatScore(candidate.compatibility)}</TableCell>
                      <TableCell className="text-right">{formatScore(candidate.confidence)}</TableCell>
                      <TableCell className="text-right">{formatScore(candidate.risk)}</TableCell>
                      <TableCell className="text-center">
                        {rankingId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(index);
                            }}
                            className="text-electric-blue"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}