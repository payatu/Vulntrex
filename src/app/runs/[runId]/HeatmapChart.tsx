"use client";
import { useMemo } from "react";

interface DetectorRow { detectorName: string; absoluteScore?: number }
interface ProbeCard { probeName: string; detectors?: DetectorRow[] }

export default function HeatmapChart({ probes }: { probes: ProbeCard[] }) {
    const { probeNames, detectorNames, matrix } = useMemo(() => {
        const probeNames = probes.map((p) => p.probeName);
        const detectorNames = Array.from(new Set(probes.flatMap((p) => p.detectors?.map((d) => d.detectorName) ?? [])));
        const matrix: (number | null)[][] = probeNames.map(() => detectorNames.map(() => null));
        for (let pIdx = 0; pIdx < probeNames.length; pIdx++) {
            const probe = probes[pIdx];
            for (let dIdx = 0; dIdx < detectorNames.length; dIdx++) {
                const detector = detectorNames[dIdx];
                // Find the detector entry for this specific probe
                const detectorEntry = probe.detectors?.find((d) => d.detectorName === detector);
                // Use the absolute score if available
                if (detectorEntry && typeof detectorEntry.absoluteScore === "number") {
                    matrix[pIdx][dIdx] = detectorEntry.absoluteScore;
                }
            }
        }
        return { probeNames, detectorNames, matrix };
    }, [probes]);

    const getColor = (score: number | null) => {
        if (score === null) return "bg-gray-100 dark:bg-gray-800";
        const pct = Math.round(score * 100);
        if (pct >= 90) return "bg-green-200 dark:bg-green-800";
        if (pct >= 70) return "bg-yellow-200 dark:bg-yellow-800";
        if (pct >= 50) return "bg-orange-200 dark:bg-orange-800";
        return "bg-red-200 dark:bg-red-800";
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Security Analysis Heatmap</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Probe × Detector Vulnerability Matrix
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="text-left p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 font-semibold text-gray-900 dark:text-white">
                                Security Probe
                            </th>
                            {detectorNames.map((d) => (
                                <th
                                    key={d}
                                    className="text-center p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 font-semibold text-gray-900 dark:text-white min-w-[80px]"
                                    title={d}
                                >
                                    {d.split(".").pop()}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {probeNames.map((probe, pIdx) => (
                            <tr key={probe} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <td className="p-3 border-r border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-white bg-gray-25" title={probe}>
                                    {probe.split(".").pop()}
                                </td>
                                {detectorNames.map((_, dIdx) => {
                                    const score = matrix[pIdx][dIdx];
                                    return (
                                        <td
                                            key={dIdx}
                                            className={`p-3 text-center font-medium ${getColor(score)} border border-gray-200 dark:border-gray-600 transition-colors hover:scale-105`}
                                            title={score !== null ? `${probe.split(".").pop()} vs ${detectorNames[dIdx].split(".").pop()}: ${(score! * 100).toFixed(0)}% pass rate` : "No data"}
                                        >
                                            {score !== null ? (
                                                <span className={`font-bold ${score >= 0.9 ? 'text-green-800 dark:text-green-200' : score >= 0.7 ? 'text-yellow-800 dark:text-yellow-200' : score >= 0.5 ? 'text-orange-800 dark:text-orange-200' : 'text-red-800 dark:text-red-200'}`}>
                                                    {(score * 100).toFixed(0)}%
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500">—</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Risk Assessment Legend</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-200 dark:bg-green-800 rounded border"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">90%+ (Low Risk)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-800 rounded border"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">70-89% (Medium Risk)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-orange-200 dark:bg-orange-800 rounded border"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">50-69% (High Risk)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-200 dark:bg-red-800 rounded border"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">&lt;50% (Critical Risk)</span>
                    </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    Higher percentages indicate better security posture. Darker colors represent higher risk levels.
                </p>
            </div>
        </div>
    );
}
