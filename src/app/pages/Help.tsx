import React from 'react';

export function Help() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-bold text-white">Help</h1>

      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white">How it works</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            PathAI Verify audits resume claims against external evidence (GitHub, LinkedIn) and linguistic patterns to detect fabrications or AI-generated descriptions.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white">Confidence Scores</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            A high score indicates verifiable evidence was found. A low score suggests a lack of public proof or timeline inconsistencies.
          </p>
        </div>

        <div className="space-y-2 pt-6 border-t border-slate-900">
          <h3 className="text-sm font-bold text-white">Contact</h3>
          <p className="text-xs text-slate-500">support@pathai.verify</p>
        </div>
      </div>
    </div>
  );
}
