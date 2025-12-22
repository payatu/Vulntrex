"use client";
import { useMemo, useState, useEffect } from "react";
import HeatmapChart from "./HeatmapChart";

interface DetectorRow { detectorName: string; absoluteScore?: number }
interface ProbeCard { probeName: string; probeScore?: number; probeDescr?: string; detectors?: DetectorRow[] }
interface AttemptRow {
    uuid: string;
    probe: string;
    seq: number;
    prompt: string;
    outputs: string[];
    hasHit?: boolean;
    hitlogData?: {
        goal: string;
        triggers: string[];
        score: number;
        detector: string;
        outputIndex?: number;
    };
}

export default function RunDetailClient({ runId, probes }: { runId: string; probes: ProbeCard[] }) {
    const [probeFilter, setProbeFilter] = useState("");
    const [minScore, setMinScore] = useState(0);
    const [detectorFilter, setDetectorFilter] = useState("");
    const [hitsOnly, setHitsOnly] = useState(false);
    const [expandedAttempts, setExpandedAttempts] = useState<Record<string, boolean>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [attempts, setAttempts] = useState<AttemptRow[]>([]);
    const [totalAttempts, setTotalAttempts] = useState(0);
    const [loading, setLoading] = useState(false);
    // Default to false (closed) as requested
    const [showVisualAnalysis, setShowVisualAnalysis] = useState(false);
    const itemsPerPage = 50;

    const probeNames = useMemo(() => Array.from(new Set(probes.map((p) => p.probeName))), [probes]);
    const detectorNames = useMemo(() => Array.from(new Set(probes.flatMap((p) => p.detectors?.map((d) => d.detectorName) ?? []))), [probes]);

    const visibleProbes = useMemo(() => {
        return probes.filter((p) => {
            const okProbe = probeFilter ? p.probeName === probeFilter : true;
            const okScore = typeof p.probeScore === "number" ? (p.probeScore * 100) >= minScore : true;
            const okDetector = detectorFilter ? (p.detectors ?? []).some((d) => d.detectorName === detectorFilter) : true;
            return okProbe && okScore && okDetector;
        });
    }, [probes, probeFilter, minScore, detectorFilter]);
    const visibleProbesWithDetector = useMemo(() => visibleProbes, [visibleProbes]);

    // simple chart: counts of passed vs total per probe (approx via probeScore)
    const chartData = useMemo(() => {
        return visibleProbesWithDetector.map((p) => ({ name: p.probeName, score: typeof p.probeScore === "number" ? Math.round(p.probeScore * 100) : 0 }));
    }, [visibleProbesWithDetector]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [probeFilter, minScore, detectorFilter, hitsOnly]);

    // Fetch attempts from API
    useEffect(() => {
        const fetchAttempts = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: itemsPerPage.toString(),
                    probe: probeFilter,
                    score: minScore.toString(),
                    detector: detectorFilter,
                    hitsOnly: hitsOnly.toString(),
                });
                const res = await fetch(`/api/runs/${runId}/attempts?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setAttempts(data.attempts);
                    setTotalAttempts(data.total);
                }
            } catch (error) {
                console.error("Failed to fetch attempts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAttempts();
    }, [runId, currentPage, probeFilter, minScore, detectorFilter, hitsOnly]);

    const totalPages = Math.ceil(totalAttempts / itemsPerPage);

    const toggleAttempt = (key: string) => {
        setExpandedAttempts(prev => ({ ...prev, [key]: !(prev[key] ?? false) }));
    };

    return (
        <div className="space-y-8">
            {/* Sticky Filters Bar */}
            <div className="sticky top-[154px] z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-all shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">Probe Filter</label>
                        <select
                            value={probeFilter}
                            onChange={(e) => setProbeFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 dark:text-white transition-all hover:bg-gray-100 dark:hover:bg-gray-750"
                        >
                            <option value="">All Probes</option>
                            {probeNames.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">Detector Filter</label>
                        <select
                            value={detectorFilter}
                            onChange={(e) => setDetectorFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 dark:text-white transition-all hover:bg-gray-100 dark:hover:bg-gray-750"
                        >
                            <option value="">All Detectors</option>
                            {detectorNames.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-[140px]">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">Min Score (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={minScore}
                                onChange={(e) => setMinScore(parseInt(e.target.value || "0", 10))}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 dark:text-white pl-4 pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                        </div>
                    </div>
                    <div className="flex items-end pb-1 h-[62px]">
                        <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-all select-none group border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
                            <input
                                type="checkbox"
                                checked={hitsOnly}
                                onChange={(e) => setHitsOnly(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 group-hover:border-blue-400 transition-colors"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Show Hits Only</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Visual Analysis Toggle */}
            <div className="space-y-6">
                <button
                    onClick={() => setShowVisualAnalysis(!showVisualAnalysis)}
                    className="w-full group flex items-center justify-between p-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300"
                >
                    <div className="flex items-center gap-4 p-4">
                        <div className={`p-3 rounded-xl transition-colors duration-300 ${showVisualAnalysis ? 'bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                Visual Analysis Dashboard
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                View detailed heatmap & security probe performance charts
                            </p>
                        </div>
                    </div>
                    <div className="pr-6">
                        <div className={`w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center transform transition-all duration-300 ${showVisualAnalysis ? 'rotate-180 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-400 group-hover:bg-gray-100'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </button>

                {showVisualAnalysis && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
                        {/* Enhanced probe score visualization */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Probe Performance
                                </h3>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Score Overview</div>
                            </div>

                            {chartData.length === 0 ? (
                                <div className="text-center py-12 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                                        <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">No probes found</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {chartData.map((c, index) => {
                                        const getScoreColor = (score: number) => {
                                            if (score >= 90) return 'bg-emerald-500';
                                            if (score >= 70) return 'bg-yellow-500';
                                            if (score >= 50) return 'bg-orange-500';
                                            return 'bg-red-500';
                                        };

                                        const getScoreTextColor = (score: number) => {
                                            if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
                                            if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
                                            if (score >= 50) return 'text-orange-600 dark:text-orange-400';
                                            return 'text-red-600 dark:text-red-400';
                                        };

                                        return (
                                            <div key={c.name} className="group bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{c.name}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`text-lg font-bold ${getScoreTextColor(c.score)}`}>
                                                            {c.score}%
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${getScoreColor(c.score)}`}
                                                        style={{ width: `${Math.min(100, Math.max(0, c.score))}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* heatmap */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                                    Vulnerability Heatmap
                                </h3>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Distribution</div>
                            </div>
                            <div className="rounded-xl overflow-hidden">
                                <HeatmapChart probes={visibleProbesWithDetector} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Attempt Details
                            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold">{totalAttempts}</span>
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Detailed breakdown of prompts and vulnerability triggers</p>
                    </div>
                    <div>
                        <a
                            href={`/api/runs/${runId}/export`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm hover:shadow"
                        >
                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export to CSV
                        </a>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Loading attempts data...</p>
                </div>
            ) : attempts.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No attempts found</h3>
                    <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Try adjusting your filters or search criteria to see more results.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {attempts.map((a, index) => {
                        const isExpanded = expandedAttempts[`${a.uuid}-${a.seq}-${index}`] ?? false;
                        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;

                        return (
                            <div
                                key={`${a.uuid}-${a.seq}-${index}`}
                                className={`group transition-all duration-200 ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-750'}`}
                            >
                                <div
                                    className="px-6 py-4 cursor-pointer select-none"
                                    onClick={() => toggleAttempt(`${a.uuid}-${a.seq}-${index}`)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${a.hasHit
                                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
                                                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-700 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                                }`}>
                                                {globalIndex}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{a.probe}</span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500">SEQ-{a.seq}</span>
                                                </div>
                                                {a.hasHit && (
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                        VULNERABILITY DETECTED
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="hidden sm:flex flex-col items-end">
                                                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Outputs</div>
                                                <div className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">{a.outputs.length}</div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-blue-100 text-blue-600 rotate-180' : 'text-gray-400 group-hover:bg-white group-hover:shadow-sm'}`}>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-6 pb-6 pt-2 space-y-6 animate-fadeIn">
                                        <div className="pl-14">
                                            {/* Vulnerability Details (if hit && hitlogData exists) */}
                                            {a.hitlogData && (
                                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                                    <div className="flex items-start gap-3">
                                                        <span className="text-2xl">🚨</span>
                                                        <div className="flex-1">
                                                            <h5 className="text-sm font-bold text-red-900 dark:text-red-300 mb-3">Vulnerability Analysis</h5>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                                                                    <span className="block text-[10px] uppercase font-bold text-red-400 mb-1">Goal</span>
                                                                    <span className="font-medium text-red-900 dark:text-red-200">{a.hitlogData.goal}</span>
                                                                </div>
                                                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                                                                    <span className="block text-[10px] uppercase font-bold text-red-400 mb-1">Detector</span>
                                                                    <span className="font-medium text-red-900 dark:text-red-200">{a.hitlogData.detector}</span>
                                                                </div>
                                                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                                                                    <span className="block text-[10px] uppercase font-bold text-red-400 mb-1">Severity Score</span>
                                                                    <span className="font-medium text-red-900 dark:text-red-200 text-lg">{(a.hitlogData.score * 100).toFixed(1)}%</span>
                                                                </div>
                                                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                                                                    <span className="block text-[10px] uppercase font-bold text-red-400 mb-1">Trigger Keywords</span>
                                                                    <span className="font-medium text-red-900 dark:text-red-200 font-mono">{a.hitlogData?.triggers?.join(", ") || "None"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Prompt */}
                                            <div className="mb-6">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Input Prompt</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(a.prompt);
                                                        }}
                                                        className="text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2v2h-4V5z" />
                                                        </svg>
                                                        Copy Input
                                                    </button>
                                                </div>
                                                <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm relative group/prompt">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-gray-200 dark:bg-gray-700 rounded-l-xl"></div>
                                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono leading-relaxed pl-2">{a.prompt}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Generated Outputs ({a.outputs.length})</h4>
                                                <div className="space-y-4">
                                                    {a.outputs.map((output, idx) => (
                                                        <div key={idx} className={`relative rounded-xl p-4 border transition-all ${a.hitlogData?.outputIndex === idx ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/50 shadow-sm' : 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700'}`}>
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${a.hitlogData?.outputIndex === idx ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                                        {idx + 1}
                                                                    </div>
                                                                    {a.hitlogData?.outputIndex === idx && (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                                            Flagged Output
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigator.clipboard.writeText(output);
                                                                    }}
                                                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                                                    title="Copy Output"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto pl-1">
                                                                {output}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing <span className="font-bold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, totalAttempts)}</span> of <span className="font-bold text-gray-900 dark:text-white">{totalAttempts}</span> results
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-white dark:bg-gray-800"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-white dark:bg-gray-800"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
