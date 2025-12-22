import fs from "fs";
import path from "path";
import CompareClient from "./CompareClient";

interface RunListItem {
  id: string;
  startTime?: string;
  model?: string;
  probe?: string;
}

function getRuns(): RunListItem[] {
  const runsDir = path.join(process.cwd(), "data", "runs");
  if (!fs.existsSync(runsDir)) return [];
  const items: RunListItem[] = [];
  for (const id of fs.readdirSync(runsDir)) {
    const file = path.join(runsDir, id, "normalized.json");
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf-8"));
      items.push({
        id,
        startTime: data?.meta?.startTime,
        model: [data?.meta?.modelType, data?.meta?.modelName].filter(Boolean).join(" / "),
        probe: data?.meta?.probeSpec,
      });
    } catch { }
  }
  return items.sort((a, b) => (b.startTime || "").localeCompare(a.startTime || ""));
}

export default function ComparePage() {
  const runs = getRuns();
  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white mb-4">
          Compare Scans
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Analyze performance differences and vulnerability regression between two scan runs
        </p>
      </div>

      {runs.length < 2 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="mx-auto w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-orange-200 dark:ring-orange-800">
            <svg className="w-10 h-10 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Not enough runs to compare</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            You need at least two completed scans to perform a comparison. Upload more reports or run new scans.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/upload"
              className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
            >
              Upload Report
            </a>
          </div>
        </div>
      ) : (
        <CompareClient runs={runs} />
      )}
    </main>
  );
}
