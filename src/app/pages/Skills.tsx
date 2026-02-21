import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useVerification } from "../context/VerificationContext";

type SkillStatus = "Verified" | "Inflated" | "Buzzword" | "Likely";
type StatusFilter = "All" | SkillStatus;

type Skill = {
  name: string;
  category: string;
  claimed: string;
  conf: number;
  status: SkillStatus;
  reason: string;
};

function statusBadgeClasses(status: SkillStatus) {
  switch (status) {
    case "Verified":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Buzzword":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "Inflated":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Likely":
    default:
      return "bg-sky-500/10 text-sky-300 border-sky-500/20";
  }
}

function clampPct(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function Skills() {
  const navigate = useNavigate();
  const { currentScan } = useVerification();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  if (!currentScan) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-slate-900 rounded bg-slate-900/10">
        <p className="text-slate-500 text-sm mb-4">No active scan results found.</p>
        <Link to="/" className="text-xs font-bold text-indigo-400 hover:underline">
          Run your first scan
        </Link>
      </div>
    );
  }

  const skills = (currentScan.skills ?? []) as Skill[];

  const normalizedQ = useMemo(() => query.trim().toLowerCase(), [query]);

  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const haystack = `${s.name} ${s.category} ${s.claimed} ${s.status} ${s.reason}`.toLowerCase();
      const matchesText = !normalizedQ || haystack.includes(normalizedQ);
      const matchesStatus = statusFilter === "All" || s.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [skills, normalizedQ, statusFilter]);

  const hasNoResults = filteredSkills.length === 0;
  const hasActiveFilters = normalizedQ.length > 0 || statusFilter !== "All";

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("All");
  };

  const goReportsWithQuery = () => {
    const q = query.trim();
    // If you already have query support on Reports, this will pre-fill it.
    // Otherwise it's harmless.
    navigate(`/reports?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header + Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Skill Breakdown</h1>
          <p className="text-xs text-slate-500 mt-1">
            Search filters <span className="text-slate-300">Skills</span> only. Try:{" "}
            <span className="text-slate-400">"kubernetes"</span>,{" "}
            <span className="text-slate-400">"backend"</span>,{" "}
            <span className="text-slate-400">"buzzword"</span>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search skills (e.g. "python", "devops")'
            className="w-full sm:w-80 bg-black/40 border border-slate-900 rounded px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            aria-label="Search skills"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-black/40 border border-slate-900 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            aria-label="Filter by status"
          >
            <option value="All">All statuses</option>
            <option value="Verified">Verified</option>
            <option value="Inflated">Inflated</option>
            <option value="Buzzword">Buzzword</option>
            <option value="Likely">Likely</option>
          </select>
        </div>
      </div>

      {/* Empty State / Guidance */}
      {hasNoResults && hasActiveFilters && (
        <div className="border border-slate-900 rounded bg-slate-900/10 p-5">
          <div className="text-sm text-slate-300">
            No results for{" "}
            <span className="text-white font-semibold">"{query.trim()}"</span>.
          </div>
          <div className="text-xs text-slate-600 mt-1">
            This page searches the <span className="text-slate-400">Skills dataset</span> only.
            If you meant candidate roles (e.g. “Hardware Developer”), search in{" "}
            <span className="text-slate-400">Reports</span>.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 text-xs font-bold rounded border border-slate-800 bg-black/30 text-slate-200 hover:bg-black/40"
            >
              Clear filters
            </button>

            <button
              type="button"
              onClick={goReportsWithQuery}
              disabled={!query.trim()}
              className="px-3 py-2 text-xs font-bold rounded bg-indigo-500 text-black hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search in Reports
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-slate-900 rounded overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500">
            <tr>
              <th className="px-6 py-4">Skill</th>
              <th className="px-6 py-4">Claimed</th>
              <th className="px-6 py-4">Confidence</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-900">
            {filteredSkills.map((s, i) => {
              const pct = clampPct(s.conf);

              return (
                <tr key={`${s.name}-${s.category}-${i}`} className="hover:bg-slate-900/20">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{s.name}</div>
                    <div className="text-[10px] text-slate-500">{s.category}</div>
                  </td>

                  <td className="px-6 py-4 text-slate-400">{s.claimed}</td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{pct}%</span>
                      <div className="w-16 h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusBadgeClasses(
                        s.status
                      )}`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              );
            })}

            {filteredSkills.length === 0 && (
              <tr>
                <td className="px-6 py-8" colSpan={4}>
                  <div className="text-sm text-slate-400">No skills to display.</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {hasActiveFilters
                      ? "Try a different keyword or reset the status filter."
                      : "This scan contains zero skills."}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Technical Context */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs uppercase font-bold text-slate-500">Technical Context</h2>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-200"
            >
              Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSkills.map((s, i) => (
            <div key={`${s.name}-ctx-${i}`} className="p-4 bg-slate-900/20 border border-slate-900 rounded">
              <p className="text-xs font-bold text-white mb-1">{s.name}</p>
              <p className="text-xs text-slate-500 leading-relaxed italic">"{s.reason}"</p>
            </div>
          ))}

          {filteredSkills.length === 0 && (
            <div className="p-4 bg-slate-900/10 border border-slate-900 rounded">
              <p className="text-xs font-bold text-white mb-1">No context</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                There are no matching skills to show technical context for.
              </p>

              {hasActiveFilters && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-3 py-2 text-xs font-bold rounded border border-slate-800 bg-black/30 text-slate-200 hover:bg-black/40"
                  >
                    Clear filters
                  </button>

                  <button
                    type="button"
                    onClick={goReportsWithQuery}
                    disabled={!query.trim()}
                    className="px-3 py-2 text-xs font-bold rounded bg-indigo-500 text-black hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Search in Reports
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}