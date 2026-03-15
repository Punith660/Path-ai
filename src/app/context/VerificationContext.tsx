import React, { createContext, useContext, useState, useEffect } from 'react';

export type Skill = {
  name: string;
  category: string;
  claimed: string;
  conf: number;
  status: 'Verified' | 'Inflated' | 'Buzzword' | 'Likely';
  reason: string;
};

export type AuditLog = {
  type: 'AI' | 'Sync' | 'Code' | 'Log';
  msg: string;
  impact: string;
  severity: 'high' | 'medium' | 'success';
};

export type ScanResult = {
  id: string;
  candidateName: string;
  role: string;
  date: string;
  confidence: number;
  verdict: string;
  verdictDescription: string;
  riskLevel: 'High' | 'Moderate' | 'Low';
  skills: Skill[];
  logs: AuditLog[];
};

type VerificationContextType = {
  currentScan: ScanResult | null;
  history: ScanResult[];
  runVerification: (data: { name: string; role: string; file: File | null; linkedin?: string; github?: string }) => Promise<void>;
  setCurrentScan: (scan: ScanResult) => void;
};

const VerificationContext = createContext<VerificationContextType | undefined>(undefined);

const MOCK_ROLES = [
  "Senior Software Engineer",
  "Product Manager",
  "DevOps Engineer",
  "Fullstack Developer",
  "Security Analyst"
];

export function VerificationProvider({ children }: { children: React.ReactNode }) {
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pathai_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pathai_history', JSON.stringify(history));
  }, [history]);

  const runVerification = async (input: { name: string; role: string; file: File | null; linkedin?: string; github?: string }) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Try to extract text from uploaded resume (best-effort client-side)
    async function extractText(file: File | null): Promise<string> {
      if (!file) return '';
      // Prefer text read; this will work for .txt and sometimes .docx/.pdf depending on encoding
      try {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.onload = () => resolve(String(reader.result ?? ''));
          reader.readAsText(file);
        });
        return text;
      } catch (e) {
        try {
          // Fallback: read as ArrayBuffer and decode as utf-8
          const buffer = await file.arrayBuffer();
          const dec = new TextDecoder('utf-8', { fatal: false });
          return dec.decode(buffer);
        } catch (e2) {
          return '';
        }
      }
    }

    const resumeText = (await extractText(input.file)).toLowerCase();

    // Simple skill keywords map - extend as needed
    const KEYWORDS: Record<string, { name: string; category: string }> = {
      javascript: { name: 'JavaScript', category: 'Frontend' },
      typescript: { name: 'TypeScript', category: 'Frontend' },
      react: { name: 'React', category: 'Frontend' },
      angular: { name: 'Angular', category: 'Frontend' },
      vue: { name: 'Vue', category: 'Frontend' },
      python: { name: 'Python', category: 'Backend' },
      django: { name: 'Django', category: 'Backend' },
      flask: { name: 'Flask', category: 'Backend' },
      node: { name: 'Node.js', category: 'Backend' },
      golang: { name: 'Go', category: 'Backend' },
      java: { name: 'Java', category: 'Backend' },
      spring: { name: 'Spring', category: 'Backend' },
      kubernetes: { name: 'Kubernetes', category: 'DevOps' },
      docker: { name: 'Docker', category: 'DevOps' },
      aws: { name: 'AWS', category: 'Cloud' },
      azure: { name: 'Azure', category: 'Cloud' },
      gcp: { name: 'GCP', category: 'Cloud' },
      terraform: { name: 'Terraform', category: 'DevOps' },
      sql: { name: 'SQL', category: 'Database' },
      postgresql: { name: 'PostgreSQL', category: 'Database' },
      mysql: { name: 'MySQL', category: 'Database' },
      mongodb: { name: 'MongoDB', category: 'Database' },
      css: { name: 'CSS', category: 'Frontend' },
      html: { name: 'HTML', category: 'Frontend' },
      'machine learning': { name: 'Machine Learning', category: 'Data Science' },
      'deep learning': { name: 'Deep Learning', category: 'Data Science' },
      pandas: { name: 'Pandas', category: 'Data Science' },
      numpy: { name: 'NumPy', category: 'Data Science' }
    };

    const found = new Map<string, { keyword: string; count: number }>();
    if (resumeText) {
      for (const kw of Object.keys(KEYWORDS)) {
        const re = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
        const matches = resumeText.match(re);
        if (matches && matches.length > 0) {
          const key = KEYWORDS[kw].name;
          found.set(key, { keyword: kw, count: matches.length });
        }
      }
    }

    // Base confidence logic
    const hasEvidence = !!(input.linkedin || input.github);
    const confidenceBase = hasEvidence ? 65 : 40;
    const randomBoost = Math.floor(Math.random() * 30);
    const finalConfidence = Math.min(98, confidenceBase + randomBoost);

    const verdict = finalConfidence > 80 ? 'Highly Authentic' : finalConfidence > 60 ? 'Likely Authentic' : 'Moderate Risk Detected';
    const riskLevel = finalConfidence > 80 ? 'Low' : finalConfidence > 50 ? 'Moderate' : 'High';

    // Build skills list: include extracted skills, else fall back to mock set
    let skillsList: Skill[] = [];
    if (found.size > 0) {
      const maxCount = Math.max(...Array.from(found.values()).map((v) => v.count));
      skillsList = Array.from(found.entries()).map(([name, info]) => {
        const percent = Math.round(Math.min(100, finalConfidence + (info.count / maxCount) * 10));
        const category = Object.values(KEYWORDS).find((k) => k.name === name)?.category ?? 'Other';
        const status: Skill['status'] = percent > 80 ? 'Verified' : percent > 55 ? 'Likely' : 'Inflated';
        return { name, category, claimed: 'Mentioned', conf: percent, status, reason: `Found ${info.count} mention(s) of "${info.keyword}" in resume.` };
      });
    } else {
      skillsList = [
        { name: 'Python', category: 'Backend', claimed: 'Expert', conf: Math.min(100, finalConfidence + 5), status: finalConfidence > 70 ? 'Verified' : 'Likely', reason: 'Evidence found in project descriptions.' },
        { name: 'React', category: 'Frontend', claimed: 'Advanced', conf: Math.max(10, finalConfidence - 20), status: finalConfidence > 85 ? 'Verified' : 'Inflated', reason: 'Skill depth vs years claimed shows slight variance.' }
      ];
    }

    const newScan: ScanResult = {
      id: `PX-${Math.floor(10000 + Math.random() * 90000)}`,
      candidateName: input.name || 'Unknown Candidate',
      role: input.role || MOCK_ROLES[Math.floor(Math.random() * MOCK_ROLES.length)],
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      confidence: finalConfidence,
      verdict,
      verdictDescription: `Audit for ${input.name} completed. ${hasEvidence ? 'External evidence found and cross-referenced.' : 'Limited external evidence available for validation.'} ${finalConfidence < 60 ? 'Significant anomalies detected in skill timelines.' : 'Skill growth pattern appears consistent with industry standards.'}`,
      riskLevel,
      skills: skillsList,
      logs: [
        { type: 'AI', msg: 'Adversarial phrasing check: 12% probability of LLM assistance.', impact: 'Neutral', severity: 'success' },
        { type: 'Sync', msg: `Cross-reference with ${input.linkedin ? 'LinkedIn' : 'Public Data'} success.`, impact: '+15% Conf', severity: 'success' },
        { type: 'Log', msg: 'Timeline analysis shows no major employment gaps.', impact: 'Stable', severity: 'success' }
      ]
    };

    setCurrentScan(newScan);
    setHistory(prev => [newScan, ...prev]);
  };

  return (
    <VerificationContext.Provider value={{ currentScan, history, runVerification, setCurrentScan }}>
      {children}
    </VerificationContext.Provider>
  );
}

export function useVerification() {
  const context = useContext(VerificationContext);
  if (!context) throw new Error('useVerification must be used within a VerificationProvider');
  return context;
}
