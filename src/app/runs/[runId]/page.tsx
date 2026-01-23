import Link from "next/link";
import fs from "fs";
import path from "path";
import RunDetailClient from "./RunDetailClient";

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const file = path.join(process.cwd(), "data", "runs", runId, "normalized.json");

  if (!fs.existsSync(file)) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Run Not Found</h1>
          <p className="text-gray-500 mb-4">The requested run ID could not be located.</p>
          <Link href="/runs" className="text-blue-600 hover:underline">Return to Runs List</Link>
        </div>
      </main>
    );
  }

  const data = JSON.parse(fs.readFileSync(file, "utf-8")) as {
    meta?: { modelType?: string; modelName?: string; startTime?: string };
    probes?: Array<{ probeName: string; probeScore?: number; probeDescr?: string; detectors?: Array<{ detectorName: string; absoluteScore?: number }> }>;
  };

  const probes = data?.probes ?? [];
  const modelName = data?.meta?.modelName || "Unknown Model";
  const modelType = data?.meta?.modelType || "";
  const startTime = data?.meta?.startTime ? new Date(data.meta.startTime).toLocaleString() : "Unknown Date";

  const shortId = runId.substring(0, 8);

  return (
    <main className="min-h-screen pb-20 bg-slate-50 dark:bg-slate-950">
      <div className="bg-white/95 dark:bg-slate-900/95 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <Link href="/runs" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Runs
                </Link>
                <span className="text-gray-300 dark:text-gray-700">/</span>
                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">{shortId}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3 flex-wrap">
                <span className="truncate">{modelName}</span>
                <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wide whitespace-nowrap">Report</span>
              </h1>
            </div>
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="px-3">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Provider</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white capitalize flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  {modelType || "N/A"}
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
              <div className="px-3">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Date</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">{startTime}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RunDetailClient runId={runId} probes={probes} />
      </div>
    </main>
  );
}


