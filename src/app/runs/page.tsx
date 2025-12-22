import fs from "fs";
import path from "path";
import RunsClient, { RunListItem } from "./RunsClient";

function getRuns(): RunListItem[] {
  const runsDir = path.join(process.cwd(), "data", "runs");
  if (!fs.existsSync(runsDir)) return [];
  const items: RunListItem[] = [];
  for (const id of fs.readdirSync(runsDir)) {
    const file = path.join(runsDir, id, "normalized.json");
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf-8"));

      // Check if hitlog exists AND has actual hits
      let hasHits = false;
      const hitlogPath = path.join(runsDir, id, "hitlog.jsonl");
      if (fs.existsSync(hitlogPath)) {
        try {
          // Parse JSONL format (line-by-line JSON)
          const content = fs.readFileSync(hitlogPath, "utf-8");
          const lines = content.split("\n").filter(line => line.trim());
          hasHits = lines.length > 0;
        } catch { }
      }

      items.push({
        id,
        startTime: data?.meta?.startTime,
        model: [data?.meta?.modelType, data?.meta?.modelName].filter(Boolean).join(" / "),
        probe: data?.meta?.probeSpec,
        garakVersion: data?.meta?.garakVersion,
        hasHits,
      });
    } catch { }
  }
  return items.sort((a, b) => (b.startTime || "").localeCompare(a.startTime || ""));
}

export default function RunsPage() {
  const runs = getRuns();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white mb-4">
          Scan Results
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Comprehensive analysis of your LLM vulnerability scans and security assessments
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-16 text-center border-dashed">
          <div className="mx-auto w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-blue-100 dark:ring-blue-800">
            <svg className="w-10 h-10 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No scan results yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Upload your first Garak scan report to get started with basic security analysis and vulnerability tracking.
          </p>
          <a
            href="/upload"
            className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
          >
            Upload First Report
          </a>
        </div>
      ) : (
        <RunsClient runs={runs} />
      )}
    </div>
  );
}


