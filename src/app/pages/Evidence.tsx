import React from 'react';
import { useVerification } from '../context/VerificationContext';
import { Link } from 'react-router';

export function Evidence() {
  const { currentScan } = useVerification();

  if (!currentScan) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-slate-900 rounded bg-slate-900/10">
        <p className="text-slate-500 text-sm mb-4">No active scan results found.</p>
        <Link to="/" className="text-xs font-bold text-indigo-500 hover:underline">Run your first scan</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Audit Log</h1>
      <p className="text-xs text-slate-500 max-w-lg">
        The audit log displays individual signal detection events used to calculate the final confidence score for {currentScan.candidateName}.
      </p>

      <div className="space-y-3">
        {currentScan.logs.map((log, i) => (
          <div key={i} className="flex gap-4 p-4 border border-slate-900 rounded bg-slate-900/10">
            <div className="text-[10px] uppercase font-bold text-slate-600 w-12 pt-1">{log.type}</div>
            <div className="flex-1">
              <p className="text-sm text-slate-300">{log.msg}</p>
            </div>
            <div className={`text-xs font-bold pt-1 shrink-0 ${
              log.severity === 'high' ? 'text-rose-500' : 
              log.severity === 'medium' ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {log.impact}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 border border-slate-900 rounded bg-indigo-950/5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Adversarial Integrity Check</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-600 font-bold uppercase">Boilerplate</p>
            <p className="text-sm text-white">12% match</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-600 font-bold uppercase">Hallucination</p>
            <p className="text-sm text-white">0% detected</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-600 font-bold uppercase">Timeline Flux</p>
            <p className="text-sm text-white">Normal</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-600 font-bold uppercase">Cross-Ref</p>
            <p className="text-sm text-white">Successful</p>
          </div>
        </div>
      </div>
    </div>
  );
}
