import Link from "next/link";
import fs from "fs";
import path from "path";

function getStats() {
  const runsDir = path.join(process.cwd(), "data", "runs");
  if (!fs.existsSync(runsDir)) return { totalRuns: 0, models: [], probes: [] };

  const runs = fs.readdirSync(runsDir);
  const stats = { totalRuns: runs.length, models: new Set(), probes: new Set() };

  for (const runId of runs) {
    const file = path.join(runsDir, runId, "normalized.json");
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (data.meta?.modelName) stats.models.add(data.meta.modelName);
        if (data.meta?.probeSpec) stats.probes.add(data.meta.probeSpec);
      } catch { }
    }
  }

  return {
    totalRuns: stats.totalRuns,
    models: Array.from(stats.models),
    probes: Array.from(stats.probes)
  };
}

export default function Home() {
  const stats = getStats();
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Vulntrex";

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-gray-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:bg-[url('/grid-dark.svg')] dark:opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">v0.1.0 Beta</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="block text-gray-900 dark:text-white">Secure your LLMs with</span>
            <span className="text-gradient block mt-2">{appName}</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600 dark:text-slate-400">
            A user interface for running and analyzing NVIDIA Garak scans to discover vulnerabilities, hallucinations, and security issues in large language models.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/run"
              className="px-8 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
            >
              Start New Scan
            </Link>
            <Link
              href="/upload"
              className="px-8 py-3.5 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 font-semibold transition-all"
            >
              Upload Report
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <Link href="/runs" className="group">
            <div className="h-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 card-hover">
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Analyze Results</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Deep dive into your scan metrics with interactive heatmaps, detailed probe logs, and failure analysis.
              </p>
            </div>
          </Link>

          <Link href="/compare" className="group">
            <div className="h-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 card-hover">
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Compare Runs</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Track regression and improvements by comparing multiple scan runs side-by-side.
              </p>
            </div>
          </Link>

          <Link href="/run" className="group">
            <div className="h-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 card-hover">
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Live Scanning</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Execute Garak scans directly from the dashboard with real-time log streaming and configuration.
              </p>
            </div>
          </Link>
        </div>

        {/* Stats Summary */}
        <div className="border-t border-gray-200 dark:border-slate-800 pt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.totalRuns}</div>
              <div className="text-sm font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">Total Scans</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.models.length}</div>
              <div className="text-sm font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">Models Tested</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.probes.length}</div>
              <div className="text-sm font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">Probe Types</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">100%</div>
              <div className="text-sm font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">Open Source</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
