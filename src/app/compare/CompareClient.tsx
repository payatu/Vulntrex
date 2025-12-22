"use client";
import { useState, useMemo } from "react";

interface RunListItem {
  id: string;
  startTime?: string;
  model?: string;
  probe?: string;
}

interface RunData {
  meta?: { modelType?: string; modelName?: string; startTime?: string; garakVersion?: string };
  probes?: Array<{
    probeName: string;
    probeScore?: number;
    detectors?: Array<{ detectorName: string; absoluteScore?: number }>
  }>;
}

export default function CompareClient({ runs }: { runs: RunListItem[] }) {
  const [run1Id, setRun1Id] = useState("");
  const [run2Id, setRun2Id] = useState("");
  const [run1Data, setRun1Data] = useState<RunData | null>(null);
  const [run2Data, setRun2Data] = useState<RunData | null>(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  const loadRun = async (runId: string) => {
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) throw new Error("Failed to load run");
      return await res.json();
    } catch {
      return null;
    }
  };

  const handleRun1Change = async (id: string) => {
    setRun1Id(id);
    if (id) {
      setLoading1(true);
      const data = await loadRun(id);
      setRun1Data(data);
      setLoading1(false);
    } else {
      setRun1Data(null);
    }
  };

  const handleRun2Change = async (id: string) => {
    setRun2Id(id);
    if (id) {
      setLoading2(true);
      const data = await loadRun(id);
      setRun2Data(data);
      setLoading2(false);
    } else {
      setRun2Data(null);
    }
  };

  const comparison = useMemo(() => {
    if (!run1Data?.probes || !run2Data?.probes) return null;

    const probes1 = new Map(run1Data.probes.map(p => [p.probeName, p]));
    const probes2 = new Map(run2Data.probes.map(p => [p.probeName, p]));
    const allProbeNames = Array.from(new Set([...probes1.keys(), ...probes2.keys()])).sort();

    return allProbeNames.map(probeName => {
      const p1 = probes1.get(probeName);
      const p2 = probes2.get(probeName);

      const detectors1 = new Map(p1?.detectors?.map(d => [d.detectorName, d]) ?? []);
      const detectors2 = new Map(p2?.detectors?.map(d => [d.detectorName, d]) ?? []);
      const allDetectorNames = Array.from(new Set([...detectors1.keys(), ...detectors2.keys()])).sort();

      const detectorComparison = allDetectorNames.map(detectorName => {
        const d1 = detectors1.get(detectorName);
        const d2 = detectors2.get(detectorName);
        const score1 = d1?.absoluteScore ?? null;
        const score2 = d2?.absoluteScore ?? null;

        let delta = null;
        if (score1 !== null && score2 !== null) {
          delta = score2 - score1;
        }

        return {
          detectorName,
          score1: score1 !== null ? score1 * 100 : null,
          score2: score2 !== null ? score2 * 100 : null,
          delta,
        };
      });

      return {
        probeName,
        score1: p1?.probeScore, // Assuming normalized to 0-1 or 0-100? Usually 0-1 in data, *100 for display
        score2: p2?.probeScore,
        delta: (typeof p1?.probeScore === 'number' && typeof p2?.probeScore === 'number') ? p2!.probeScore - p1!.probeScore : null,
        detectors: detectorComparison,
      };
    });
  }, [run1Data, run2Data]);

  const ScoreBadge = ({ score }: { score: number | null }) => {
    if (score === null) return <span className="text-gray-400 dark:text-gray-600">—</span>;
    // Score passed here is already specific (0-100 or 0-1) ? Detector scores were *100 above.
    // Probe scores might be 0-1. Let's handle 0-1 vs 0-100 heuristic if needed, or assume data consistency.
    // Garak usually gives 0.0-1.0. Let's multiply if small.
    // But above I multiplied detector scores by 100.
    // Let's assume input score here is meant to be 0-100.

    // For probe scores (unmultiplied above):
    const displayScore = score <= 1 ? score * 100 : score;

    const pct = Math.round(displayScore);
    const colorClass = pct == 100 ? "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
      : pct >= 50 ? "text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30"
        : "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30";

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
        {pct}%
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-6">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">Select Runs to Compare</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative">
          {/* Divider */}
          <div className="hidden md:flex absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-700 -translate-x-1/2">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold text-xs">VS</div>
          </div>

          {/* Run A */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Baseline Run</label>
            <select
              value={run1Id}
              onChange={(e) => handleRun1Change(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none ring-1 ring-gray-200 dark:ring-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all font-medium appearance-none"
            >
              <option value="">Select a run...</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.model} - {new Date(r.startTime as string).toLocaleDateString()} ({r.id.substring(0, 6)})
                </option>
              ))}
            </select>
            {loading1 && <div className="text-sm text-blue-500 animate-pulse">Loading data...</div>}
            {run1Data && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 px-2">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div>{run1Data.meta?.modelName}</span>
                <span>•</span>
                <span>v{run1Data.meta?.garakVersion || '?'}</span>
              </div>
            )}
          </div>

          {/* Run B */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comparison Run</label>
            <select
              value={run2Id}
              onChange={(e) => handleRun2Change(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none ring-1 ring-gray-200 dark:ring-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:text-white transition-all font-medium appearance-none"
            >
              <option value="">Select a run...</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.model} - {new Date(r.startTime as string).toLocaleDateString()} ({r.id.substring(0, 6)})
                </option>
              ))}
            </select>
            {loading2 && <div className="text-sm text-purple-500 animate-pulse">Loading data...</div>}
            {run2Data && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 px-2">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div>{run2Data.meta?.modelName}</span>
                <span>•</span>
                <span>v{run2Data.meta?.garakVersion || '?'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {comparison && (
        <div className="space-y-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Detailed Comparison</h3>
          </div>

          <div className="grid gap-6">
            {comparison.map((probe) => (
              <div key={probe.probeName} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-gray-900 dark:text-white">{probe.probeName}</span>
                  </div>

                  <div className="flex items-center gap-8 text-sm">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Base</div>
                      <ScoreBadge score={probe.score1 ?? null} />
                    </div>

                    <div className="flex flex-col items-center w-16">
                      {probe.delta !== null && (
                        <>
                          <span className={`text-lg font-bold ${probe.delta > 0 ? "text-green-600" : probe.delta < 0 ? "text-red-500" : "text-gray-400"}`}>
                            {probe.delta > 0 ? "+" : ""}{(probe.delta * 100).toFixed(0)}%
                          </span>
                        </>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">New</div>
                      <ScoreBadge score={probe.score2 ?? null} />
                    </div>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {probe.detectors.map((detector) => (
                    <div key={detector.detectorName} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mr-4" title={detector.detectorName}>
                        {detector.detectorName.split('.').pop()}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <ScoreBadge score={detector.score1 !== null ? detector.score1 / 100 : null} />
                        <span className="text-gray-300 dark:text-gray-600">→</span>
                        <ScoreBadge score={detector.score2 !== null ? detector.score2 / 100 : null} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
