"use client";
import { useState } from "react";
import Link from "next/link";

const installSteps = [
  {
    id: 1,
    title: "Prerequisites",
    description: "Ensure you have Python installed",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    content: (
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="mb-2">
            <h4 className="font-bold text-gray-900 dark:text-white">Python 3.10 or higher</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Required runtime for Garak</p>
          </div>
          <code className="block mt-3 p-2 bg-slate-900 text-green-400 rounded-lg text-sm font-mono">
            python --version
          </code>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Install Garak",
    description: "Install globally using pip",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    content: (
      <div className="space-y-4">
        <div className="p-4 bg-slate-900 rounded-xl overflow-x-auto">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">Terminal</span>
            <span>Install Garak globally</span>
          </div>
          <pre className="text-sm font-mono">
            <code className="text-green-400">pip install garak</code>
          </pre>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Verify Installation",
    description: "Confirm Garak is installed correctly",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    content: (
      <div className="space-y-4">
        <div className="p-4 bg-slate-900 rounded-xl overflow-x-auto">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">Terminal</span>
            <span>Check Garak version</span>
          </div>
          <pre className="text-sm font-mono">
            <code className="text-green-400">python -m garak --version</code>
          </pre>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <h4 className="font-semibold text-green-800 dark:text-green-300">Expected Output</h4>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1 font-mono">
                garak 0.13.2 (or later version)
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: "Test Scan",
    description: "Run a quick test to ensure everything works",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    content: (
      <div className="space-y-4">
        <div className="p-4 bg-slate-900 rounded-xl overflow-x-auto">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">Terminal</span>
            <span>Run a test scan</span>
          </div>
          <pre className="text-sm font-mono">
            <code className="text-green-400">python -m garak -m test.Blank -p test.Blank</code>
          </pre>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This runs a minimal test using the blank probe and model, confirming Garak executes correctly.
        </p>
      </div>
    ),
  },
];

const concepts = [
  {
    title: "Probes",
    description: "Attack payloads designed to test specific vulnerabilities in LLMs",
    icon: "🎯",
    examples: [
      { name: "lmrc.SlurUsage", desc: "Tests if the model uses slurs" },
      { name: "dan.Dan", desc: "DAN (Do Anything Now) jailbreak attempts" },
      { name: "promptinject.Hijack", desc: "Prompt injection attacks" },
      { name: "encoding.InjectBase64", desc: "Base64 encoded injection attacks" },
    ],
    command: "python -m garak --list_probes",
  },
  {
    title: "Detectors",
    description: "Analyzers that examine model outputs to determine if an attack succeeded",
    icon: "🔍",
    examples: [
      { name: "mitigation.MitigationBypass", desc: "Detects if safety mitigations were bypassed" },
      { name: "unsafe_content.SurgeProfanitySexual", desc: "Detects profanity and sexual content" },
      { name: "base.TriggerListDetector", desc: "Matches against known trigger words" },
    ],
    command: "python -m garak --list_detectors",
    note: "If you don't select detectors, Garak automatically uses the default detectors recommended for the selected probe(s).",
  },
  {
    title: "Generators",
    description: "Interfaces that connect Garak to different LLM providers",
    icon: "⚡",
    providers: [
      { name: "huggingface", desc: "Local HuggingFace models" },
      { name: "huggingface.InferenceAPI", desc: "HuggingFace Inference API" },
      { name: "openai", desc: "OpenAI API (GPT-3.5, GPT-4)" },
      { name: "rest", desc: "Generic REST API endpoint" },
      { name: "replicate", desc: "Replicate hosted models" },
      { name: "cohere", desc: "Cohere API" },
    ],
  },
  {
    title: "Generations",
    description: "Number of times each probe is sent to the model",
    icon: "🔄",
    info: "Higher generations = more thorough testing but takes longer. Default: 5, Recommended for quick tests: 3",
  },
];

const resources = [
  {
    title: "GitHub Repository",
    description: "Source code & issues",
    url: "https://github.com/NVIDIA/garak",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    title: "Official Docs",
    description: "Comprehensive documentation",
    url: "https://docs.garak.ai/",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: "PyPI Package",
    description: "Package details & history",
    url: "https://pypi.org/project/garak/",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
];

export default function LearnGarakPage() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [expandedConcept, setExpandedConcept] = useState<string | null>("Probes");

  const toggleStep = (stepId: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId]
    );
  };

  const progress = (completedSteps.length / installSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-500/5 dark:via-teal-500/3 dark:to-cyan-500/5" />
        <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%2310b981" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        
        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Learn <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">Garak</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Quick installation guide and core concepts of Garak, the LLM vulnerability scanner by NVIDIA.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-10 max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Installation Progress</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{completedSteps.length}/{installSteps.length} steps</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Installation Steps */}
        <div className="space-y-6 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Installation Steps</h2>
          {installSteps.map((step) => (
            <div
              key={step.id}
              className={`relative bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 ${
                completedSteps.includes(step.id)
                  ? "border-emerald-300 dark:border-emerald-700 shadow-lg shadow-emerald-500/10"
                  : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
              }`}
            >
              <div
                className="flex items-center gap-4 p-6 cursor-pointer"
                onClick={() => toggleStep(step.id)}
              >
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    completedSteps.includes(step.id)
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {completedSteps.includes(step.id) ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">STEP {step.id}</span>
                    {completedSteps.includes(step.id) && (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">
                        DONE
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{step.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{step.description}</p>
                </div>
                <button
                  className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                    completedSteps.includes(step.id)
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500"
                  }`}
                >
                  {completedSteps.includes(step.id) && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="px-6 pb-6 pt-0">
                <div className="pl-16">{step.content}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Completion Message */}
        {completedSteps.length === installSteps.length && (
          <div className="mb-16 p-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-white text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">Installation Complete!</h3>
            <p className="text-emerald-100 mb-6">
              Garak is now installed and ready. You can start scanning LLMs for vulnerabilities.
            </p>
            <Link
              href="/run"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-colors"
            >
              Start Your First Scan
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}

        {/* Garak Concepts Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Garak Concepts</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Understanding the core components of Garak vulnerability scanning</p>
          
          <div className="space-y-4">
            {concepts.map((concept) => (
              <div
                key={concept.title}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedConcept(expandedConcept === concept.title ? null : concept.title)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center text-2xl">
                    {concept.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{concept.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{concept.description}</p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedConcept === concept.title ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedConcept === concept.title && (
                  <div className="px-5 pb-5 pt-0 border-t border-gray-100 dark:border-slate-800">
                    <div className="pl-16 pt-4 space-y-4">
                      {concept.examples && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Examples:</h4>
                          <div className="grid gap-2">
                            {concept.examples.map((ex) => (
                              <div key={ex.name} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                                <code className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded shrink-0">{ex.name}</code>
                                <span className="text-sm text-gray-600 dark:text-gray-400">{ex.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {concept.providers && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Available Providers:</h4>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {concept.providers.map((p) => (
                              <div key={p.name} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                                <code className="text-xs font-mono text-purple-600 dark:text-purple-400">{p.name}</code>
                                <span className="text-xs text-gray-500 dark:text-gray-400">- {p.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {concept.info && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-300">{concept.info}</p>
                        </div>
                      )}
                      
                      {concept.note && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <p className="text-sm text-amber-700 dark:text-amber-300">💡 {concept.note}</p>
                        </div>
                      )}
                      
                      {concept.command && (
                        <div className="p-3 bg-slate-900 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">List all {concept.title.toLowerCase()}:</div>
                          <code className="text-sm text-green-400 font-mono">{concept.command}</code>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* How Detection Works */}
        <div className="mb-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">How Detection Works</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex-1 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-bold text-gray-900 dark:text-white">1. Probe Sends</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Malicious prompt sent to model</p>
            </div>
            <svg className="w-6 h-6 text-gray-400 rotate-90 sm:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <div className="flex-1 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="text-2xl mb-2">🤖</div>
              <div className="font-bold text-gray-900 dark:text-white">2. Model Responds</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">LLM generates output</p>
            </div>
            <svg className="w-6 h-6 text-gray-400 rotate-90 sm:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <div className="flex-1 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="text-2xl mb-2">🔍</div>
              <div className="font-bold text-gray-900 dark:text-white">3. Detector Analyzes</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Checks for vulnerability indicators</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
            If the detector finds vulnerability indicators → Attack marked as successful (<span className="text-red-600 dark:text-red-400 font-bold">HIT</span>)
          </p>
        </div>

        {/* Common Commands */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Common Commands</h2>
          <div className="bg-slate-900 rounded-2xl p-6 overflow-x-auto">
            <pre className="text-sm font-mono space-y-4">
              <div>
                <span className="text-gray-500"># List all probes</span>{"\n"}
                <span className="text-green-400">python -m garak --list_probes</span>
              </div>
              <div>
                <span className="text-gray-500"># List all detectors</span>{"\n"}
                <span className="text-green-400">python -m garak --list_detectors</span>
              </div>
              <div>
                <span className="text-gray-500"># Run specific probe on HuggingFace model</span>{"\n"}
                <span className="text-green-400">python -m garak -m huggingface -n gpt2 -p lmrc.SlurUsage</span>
              </div>
            </pre>
          </div>
        </div>

        {/* Resources Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Official Resources
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <a
                key={resource.title}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-6 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 flex items-center justify-center mb-4 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {resource.icon}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {resource.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{resource.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
