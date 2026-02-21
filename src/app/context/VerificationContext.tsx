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
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Logic to generate somewhat dynamic data
    const hasEvidence = !!(input.linkedin || input.github);
    const confidenceBase = hasEvidence ? 65 : 40;
    const randomBoost = Math.floor(Math.random() * 30);
    const finalConfidence = Math.min(98, confidenceBase + randomBoost);

    const verdict = finalConfidence > 80 ? "Highly Authentic" : finalConfidence > 60 ? "Likely Authentic" : "Moderate Risk Detected";
    const riskLevel = finalConfidence > 80 ? "Low" : finalConfidence > 50 ? "Moderate" : "High";

    const newScan: ScanResult = {
      id: `PX-${Math.floor(10000 + Math.random() * 90000)}`,
      candidateName: input.name || "Unknown Candidate",
      role: input.role || MOCK_ROLES[Math.floor(Math.random() * MOCK_ROLES.length)],
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      confidence: finalConfidence,
      verdict,
      verdictDescription: `Audit for ${input.name} completed. ${hasEvidence ? 'External evidence found and cross-referenced.' : 'Limited external evidence available for validation.'} ${finalConfidence < 60 ? 'Significant anomalies detected in skill timelines.' : 'Skill growth pattern appears consistent with industry standards.'}`,
      riskLevel,
      skills: [
        { name: 'Python', category: 'Backend', claimed: 'Expert', conf: Math.min(100, finalConfidence + 5), status: finalConfidence > 70 ? 'Verified' : 'Likely', reason: 'Evidence found in project descriptions.' },
        { name: 'React', category: 'Frontend', claimed: 'Advanced', conf: Math.max(10, finalConfidence - 20), status: finalConfidence > 85 ? 'Verified' : 'Inflated', reason: 'Skill depth vs years claimed shows slight variance.' },
        { name: 'Kubernetes', category: 'DevOps', claimed: 'Expert', conf: 18, status: 'Buzzword', reason: 'High usage of technical terms without architectural context.' }
      ],
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
