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
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 sticky top-[73px] z-30 shadow-sm backdrop-blur-xl bg-opacity-80 dark:bg-opacity-80 transition-all">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Link href="/runs" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Runs
              </Link>
              <span className="text-gray-300 dark:text-gray-700">/</span>
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">{shortId}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
              {modelName}
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-sm font-semibold tracking-wide">Report</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="px-3">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Provider</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white capitalize flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                {modelType || "N/A"}
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
            <div className="px-3">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Date</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">{startTime}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <RunDetailClient runId={runId} probes={probes} />
      </div>
    </main>
  );
}


