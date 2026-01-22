"use client";
import { useState } from "react";
import Link from "next/link";

export default function UploadPage() {
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [hitlogFile, setHitlogFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reportFile) {
      setMessage("❌ Report JSONL file is required");
      return;
    }
    const form = new FormData();
    form.append("report", reportFile);
    if (hitlogFile) form.append("hitlog", hitlogFile);
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setMessage(`✅ Successfully uploaded run: ${data.runId}`);
      setReportFile(null);
      setHitlogFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setMessage(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Upload Scan Report</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Import your Garak security scan results to visualize vulnerabilities and analyze model performance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Upload Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </span>
              Select Files
            </h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Report File */}
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report File <span className="text-red-500">*</span>
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${reportFile ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                >
                  <input
                    type="file"
                    accept=".jsonl"
                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <div className="space-y-2 pointer-events-none">
                    {reportFile ? (
                      <div className="flex flex-col items-center text-green-600 dark:text-green-400">
                        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-medium text-sm">{reportFile.name}</span>
                        <span className="text-xs opacity-75">({(reportFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <span className="text-sm font-medium">Click to upload report.jsonl</span>
                        <span className="text-xs mt-1">or drag and drop</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Hitlog File (Optional) */}
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hitlog File <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  If Garak generated a hitlog, upload it here to map and inspect vulnerability hits.
                </p>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${hitlogFile ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                >
                  <input
                    type="file"
                    accept=".jsonl"
                    onChange={(e) => setHitlogFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 pointer-events-none">
                    {hitlogFile ? (
                      <div className="flex flex-col items-center text-green-600 dark:text-green-400">
                        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-medium text-sm">{hitlogFile.name}</span>
                        <span className="text-xs opacity-75">({(hitlogFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <span className="text-sm font-medium">Click to upload hitlog.jsonl</span>
                        <span className="text-xs mt-1">Optional — some scans may not produce hits</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={loading || !reportFile}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Scan...
                    </>
                  ) : (
                    <>
                      <svg className="-ml-1 mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      Upload and Analyze
                    </>
                  )}
                </button>
              </div>
            </form>

            {message && (
              <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${message.startsWith('✅') ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'}`}>
                {message.startsWith('✅') ? (
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
                <div>
                  <p className="font-medium text-sm">{message}</p>
                  {message.startsWith('✅') && (
                    <Link href="/runs" className="text-xs underline mt-1 block hover:text-green-900 dark:hover:text-green-100">View Scan Results &rarr;</Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="text-xl">💡</span> Quick Guide
            </h3>

            <div className="space-y-6 relative">
              <div className="absolute left-[11px] top-2 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-700"></div>

              <div className="relative pl-8">
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center ring-4 ring-white dark:ring-gray-800">1</div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">Upload Report</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select the <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">report.jsonl</code> file generated by Garak. This contains the scan attempts and scores.
                </p>
              </div>

              <div className="relative pl-8">
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center justify-center ring-4 ring-white dark:ring-gray-800">2</div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">Hitlog (optional)</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If Garak generated <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">hitlog.jsonl</code>, upload it to map and inspect vulnerability hits. Not all scans produce a hitlog.
                </p>
              </div>

              <div className="relative pl-8">
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 text-xs font-bold flex items-center justify-center ring-4 ring-white dark:ring-gray-800">3</div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">Analyze</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click &quot;Upload and Analyze&quot; to process the results. You&apos;ll be redirected to the dashboard to explore the findings.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              <Link href="https://github.com/leondz/garak" target="_blank" className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Garak Documentation</span>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


