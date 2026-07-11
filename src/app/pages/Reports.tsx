import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Search, Trash2, X } from "lucide-react";
import { useVerification, ScanResult } from "../context/VerificationContext";

export function Reports() {
  const { history, setCurrentScan, deleteReport, deleteLocalReport } = useVerification();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // Read initial query from URL: /reports?q=hardware
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<ScanResult | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const normalizedQ = useMemo(() => query.trim().toLowerCase(), [query]);

  const filteredHistory = useMemo(() => {
    if (!normalizedQ) return history;

    return history.filter((r) => {
      const haystack = `${r.candidateName} ${r.jobDescription} ${r.id} ${r.date}`.toLowerCase();
      return haystack.includes(normalizedQ);
    });
  }, [history, normalizedQ]);

  const handleViewReport = (report: ScanResult) => {
    setCurrentScan(report);
    navigate("/summary");
  };

  const onChangeQuery = (val: string) => {
    setQuery(val);

    // Keep URL in sync (deep-link friendly)
    const q = val.trim();
    if (!q) {
      params.delete("q");
      setParams(params, { replace: true });
      return;
    }
    params.set("q", q);
    setParams(params, { replace: true });
  };

  const clearSearch = () => {
    setQuery("");
    params.delete("q");
    setParams(params, { replace: true });
  };

  const handleDeleteClick = (e: React.MouseEvent, report: ScanResult) => {
    e.stopPropagation(); // Prevent row click navigation
    setDeleteTarget(report);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (!deleteTarget.dbId) {
      // Local-only report: never made it to the backend, so just drop it here.
      deleteLocalReport(deleteTarget.id);
      setDeleteTarget(null);
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteReport(deleteTarget.dbId);
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete report.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>

        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search candidates…"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            className="bg-secondary/60 border border-border rounded-lg pl-8 pr-16 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-electric-blue/40 w-full"
            aria-label="Search report history"
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="glass-card h-64 flex flex-col items-center justify-center border border-border rounded-xl text-muted-foreground text-sm">
          No history available. Run a scan to see it here.
        </div>
      ) : (
        <div className="glass-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-secondary/40 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Job Description</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Confidence</th>
                <th className="px-6 py-4 text-right w-20">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border text-muted-foreground">
              {filteredHistory.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-secondary/60 cursor-pointer transition-colors group"
                  onClick={() => handleViewReport(r)}
                >
                  <td className="px-6 py-4">
                    <div className="text-foreground font-medium group-hover:text-electric-blue transition-colors">
                      {r.candidateName}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{r.id}</div>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate">{r.jobDescription || 'No JD saved'}</td>
                  <td className="px-6 py-4">{r.date}</td>
                  <td
                    className={`px-6 py-4 text-right font-bold ${
                      r.confidence > 80
                        ? "text-emerald-500"
                        : r.confidence > 60
                        ? "text-amber-500"
                        : "text-rose-500"
                    }`}
                  >
                    {r.confidence}%
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(e, r)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete report"
                      aria-label={`Delete report for ${r.candidateName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredHistory.length === 0 && (
                <tr>
                  <td className="px-6 py-8" colSpan={5}>
                    <div className="text-sm text-muted-foreground">
                      No results for{" "}
                      <span className="text-foreground font-semibold">
                        "{query.trim()}"
                      </span>
                      .
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Try a different name, job description keyword, ID, or date.
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="px-3 py-2 text-xs font-semibold rounded border border-border bg-secondary/70 text-foreground hover:bg-secondary"
                      >
                        Clear search
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Delete Report</h3>
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
                Are you sure you want to delete the report for{" "}
                <span className="font-semibold text-foreground">{deleteTarget.candidateName}</span>?
              </p>
              <p className="text-xs text-muted-foreground">
                This action cannot be undone. The report will be permanently removed{" "}
                {deleteTarget.dbId ? "from the server." : "from this device (it was never saved to the server)."}
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