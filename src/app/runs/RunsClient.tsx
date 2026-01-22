"use client";
import { useMemo, useState } from "react";

export interface RunListItem {
  id: string;
  startTime?: string;
  model?: string;
  probe?: string;
  garakVersion?: string;
  hasHits?: boolean;
}

export default function RunsClient({ runs }: { runs: RunListItem[] }) {
  const [q, setQ] = useState("");
  const [model, setModel] = useState("");
  const [probe, setProbe] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showOnlyHits, setShowOnlyHits] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const models = useMemo(() => Array.from(new Set(runs.map((r) => r.model).filter(Boolean))) as string[], [runs]);
  const probes = useMemo(() => Array.from(new Set(runs.map((r) => r.probe).filter(Boolean))) as string[], [runs]);

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      const text = `${r.id} ${r.model ?? ""} ${r.probe ?? ""}`.toLowerCase();
      const okText = q ? text.includes(q.toLowerCase()) : true;
      const okModel = model ? (r.model ?? "") === model : true;
      const okProbe = probe ? (r.probe ?? "") === probe : true;
      const okHits = showOnlyHits ? r.hasHits : true;

      const t = r.startTime ? new Date(r.startTime).getTime() : undefined;
      const okFrom = from && t ? t >= new Date(from).getTime() : true;
      const okTo = to && t ? t <= new Date(to).getTime() : true;

      return okText && okModel && okProbe && okHits && okFrom && okTo;
    });
  }, [runs, q, model, probe, from, to, showOnlyHits]);

  const activeFiltersCount = [q, model, probe, showOnlyHits, from, to].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 sticky top-20 z-30 overflow-hidden">
        {/* Header - Always Visible */}
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white text-left">Filter & Search</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-left">Refine your scan results</p>
            </div>
            {activeFiltersCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold">
                {activeFiltersCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-sm font-medium text-gray-600 dark:text-gray-300">
              {filtered.length} results
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isFiltersOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Filter Content - Collapsible */}
        {isFiltersOpen && (
          <div className="px-6 pb-6 pt-0 border-t border-gray-100 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-6 mt-6">
              {/* Search */}
              <div className="lg:col-span-4">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Search
            </label>
            <div className="relative group">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search ID, model..."
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border-none ring-1 ring-gray-200 dark:ring-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
              </div>

              {/* Model Filter */}
              <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border-none ring-1 ring-gray-200 dark:ring-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all appearance-none"
            >
              <option value="">All Models</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
              </div>

              {/* Probe Filter */}
              <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Probe Type
            </label>
            <select
              value={probe}
              onChange={(e) => setProbe(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border-none ring-1 ring-gray-200 dark:ring-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all appearance-none"
            >
              <option value="">All Probes</option>
              {probes.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
              </div>

              {/* Hits Toggle */}
              <div className="lg:col-span-2 flex items-end">
            <label className="w-full flex items-center p-2.5 bg-gray-50 dark:bg-slate-800 ring-1 ring-gray-200 dark:ring-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group">
              <input
                type="checkbox"
                checked={showOnlyHits}
                onChange={(e) => setShowOnlyHits(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                Vulnerabilities
              </span>
            </label>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border-none ring-1 ring-gray-200 dark:ring-slate-700 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border-none ring-1 ring-gray-200 dark:ring-slate-700 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
              </div>

              <div className="flex items-end justify-end">
                {(q || model || probe || showOnlyHits || from || to) && (
                  <button
                    onClick={() => {
                      setQ("");
                      setModel("");
                      setProbe("");
                      setShowOnlyHits(false);
                      setFrom("");
                      setTo("");
                    }}
                    className="text-sm px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-16 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No matching runs found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your filters or search criteria.</p>
          <button
            onClick={() => {
              setQ("");
              setModel("");
              setProbe("");
              setShowOnlyHits(false);
              setFrom("");
              setTo("");
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((r) => (
            <a
              key={r.id}
              href={`/runs/${r.id}`}
              className="group bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 overflow-hidden flex flex-col"
            >
              <div className="p-6 flex-1">
                {/* Header with ID and status */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
                        ID: {r.id.substring(0, 8)}
                      </span>
                      {r.hasHits ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          VULNERABLE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          SECURE
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {r.model || 'Unknown Model'}
                    </h3>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Probe Type</div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1" title={r.probe}>
                      {r.probe || 'N/A'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Garak Version</div>
                    <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
                      {r.garakVersion || 'v0.0.0'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {r.startTime ? new Date(r.startTime).toLocaleString() : 'Unknown Date'}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-colors">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  View Analysis Report
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}


