import React from 'react';

export function Settings() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      <div className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-xs uppercase font-bold text-slate-500">Scanning</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Strictness Level</span>
              <select className="bg-slate-900 border border-slate-800 text-xs px-2 py-1 rounded">
                <option>Standard</option>
                <option>Conservative</option>
                <option>Adversarial</option>
              </select>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Cross-Reference Sync</span>
              <div className="w-8 h-4 bg-indigo-600 rounded-full flex justify-end p-1">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-6 border-t border-slate-900">
          <h2 className="text-xs uppercase font-bold text-slate-500">API Access</h2>
          <div className="p-3 bg-slate-900 rounded font-mono text-[10px] text-slate-500 flex justify-between">
            <span>sk_live_99281...8271</span>
            <button className="text-indigo-500 hover:underline">Reveal</button>
          </div>
        </section>
      </div>
    </div>
  );
}
