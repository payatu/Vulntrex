"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Common Garak Probes grouped by category
const PROBE_CATEGORIES = {
    "LLM-Rubric": [
        "lmrc.SlurUsage",
        "lmrc.Profanity",
        "lmrc.SexualContent",
    ],
    "Jailbreak": [
        "dan.Dan",
        "dan.Dan_10_0",
        "dan.Dan_11_0",
        "jailbreak.Leetspeak",
    ],
    "Prompt Injection": [
        "promptinject.Hijack",
        "promptinject.RogueString",
    ],
    "Hallucination": [
        "snowball.Snowball",
    ],
    "Encoding": [
        "encoding.InjectBase64",
        "encoding.InjectRot13",
    ],
    "XSS": [
        "xss.MarkdownImageExfil",
    ],
};

const DETECTORS = [
    "mitigation.MitigationBypass",
    "unsafe_content.SurgeProfanitySexual",
    "base.TriggerListDetector",
];

const PROVIDERS = [
    { id: "huggingface", name: "Hugging Face (Local)", needsKey: false },
    { id: "huggingface.InferenceAPI", name: "Hugging Face (Inference API)", needsKey: true, envVar: "HF_INFERENCE_TOKEN" },
    { id: "openai", name: "OpenAI", needsKey: true, envVar: "OPENAI_API_KEY" },
    { id: "replicate", name: "Replicate", needsKey: true, envVar: "REPLICATE_API_TOKEN" },
    { id: "cohere", name: "Cohere", needsKey: true, envVar: "COHERE_API_KEY" },
    { id: "groq", name: "Groq", needsKey: true, envVar: "GROQ_API_KEY" },
    { id: "nim", name: "NVIDIA NIM", needsKey: true, envVar: "NIM_API_KEY" },
    { id: "rest", name: "REST Endpoint", needsKey: false },
    { id: "ggml", name: "GGML (llama.cpp)", needsKey: false },
    { id: "test", name: "Test (Mock)", needsKey: false },
];

const Tooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-1">
        <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-xs text-white bg-gray-900 rounded-md shadow-lg -left-20 top-full">
            {text}
        </div>
    </div>
);

export default function RunGarakPage() {
    const [provider, setProvider] = useState("huggingface");
    const [modelName, setModelName] = useState("gpt2");
    const [apiKey, setApiKey] = useState("");

    const selectedProvider = PROVIDERS.find(p => p.id === provider);

    // REST Configuration State
    const [restUri, setRestUri] = useState("");
    const [restMethod, setRestMethod] = useState("post");
    const [restHeaders, setRestHeaders] = useState("{}");
    const [restReqTemplate, setRestReqTemplate] = useState("$INPUT");
    const [restReqTemplateJson, setRestReqTemplateJson] = useState("");
    const [useJsonBody, setUseJsonBody] = useState(true); // Default to JSON since most APIs use it
    const [restResponseJson, setRestResponseJson] = useState(false);
    const [restResponseJsonField, setRestResponseJsonField] = useState("");
    const [restRequestTimeout, setRestRequestTimeout] = useState(20);
    const [restRateLimitCodes, setRestRateLimitCodes] = useState("[429]");
    const [restSkipCodes, setRestSkipCodes] = useState("[]");
    const [restVerifySsl, setRestVerifySsl] = useState(true);
    const [restProxies, setRestProxies] = useState("");
    const [rawRequest, setRawRequest] = useState("");
    const [sampleResponse, setSampleResponse] = useState("");
    const [detectedFields, setDetectedFields] = useState<{ path: string, value: string }[]>([]);

    // Parse sample response to detect string fields and their paths
    const parseResponseJson = () => {
        try {
            const json = JSON.parse(sampleResponse);
            const fields: { path: string, value: string }[] = [];

            const traverse = (obj: unknown, path: string) => {
                if (typeof obj === 'string') {
                    const preview = obj.length > 60 ? obj.substring(0, 60) + '...' : obj;
                    fields.push({ path: path || '(root)', value: preview });
                } else if (Array.isArray(obj)) {
                    obj.forEach((item, idx) => traverse(item, path ? `${path}.${idx}` : `${idx}`));
                } else if (obj && typeof obj === 'object') {
                    Object.entries(obj).forEach(([key, val]) =>
                        traverse(val, path ? `${path}.${key}` : key)
                    );
                }
            };

            traverse(json, '');

            if (fields.length === 0) {
                alert("No string fields found in the response JSON.");
                return;
            }

            setDetectedFields(fields);
            setRestResponseJson(true);
        } catch (e) {
            alert("Invalid JSON: " + e);
        }
    };

    const parseRawRequest = () => {
        try {
            const lines = rawRequest.trim().split('\n');
            if (lines.length === 0) return;

            // Parse Request Line
            const requestLine = lines[0].split(' ');
            if (requestLine.length >= 2) {
                setRestMethod(requestLine[0].toLowerCase());
                // URI might be relative, need host header or full URL
                if (requestLine[1].startsWith('http')) {
                    setRestUri(requestLine[1]);
                }
            }

            // Parse Headers and Body
            let i = 1;
            const headers: Record<string, string> = {};
            let body = "";
            let host = "";

            for (; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line === "") {
                    // Empty line indicates start of body
                    body = lines.slice(i + 1).join('\n');
                    break;
                }
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    headers[key] = value;
                    if (key.toLowerCase() === 'host') host = value;
                }
            }

            // Construct URI if relative
            if (!restUri && host) {
                const path = requestLine[1] || '/';
                setRestUri(`https://${host}${path}`); // Assume HTTPS by default
            }

            setRestHeaders(JSON.stringify(headers, null, 2));

            // Try to guess body format
            if (body) {
                try {
                    const jsonBody = JSON.parse(body);
                    // It's JSON, use req_template_json_object
                    // We can't know where $INPUT goes, so we just set it as is and let user edit
                    setRestReqTemplateJson(JSON.stringify(jsonBody, null, 2));
                    setRestReqTemplate(""); // Clear string template
                    setRestResponseJson(true); // Likely JSON response too
                } catch {
                    // Not JSON, use string template
                    setRestReqTemplate(body);
                    setRestReqTemplateJson("");
                }
            }

            alert("Request parsed! Please review the fields and insert $INPUT where the prompt should go.");
        } catch (e) {
            alert("Failed to parse request: " + e);
        }
    };

    const [selectedProbes, setSelectedProbes] = useState<string[]>(["lmrc.SlurUsage"]);
    const [selectedDetectors, setSelectedDetectors] = useState<string[]>([]);
    const [customProbes, setCustomProbes] = useState("");
    const [customDetectors, setCustomDetectors] = useState("");
    const [generations, setGenerations] = useState(3);
    const [seed, setSeed] = useState<number | "">("");
    const [garakCommand, setGarakCommand] = useState("python3 -m garak");

    const [availableProbes, setAvailableProbes] = useState<string[]>([]);
    const [availableDetectors, setAvailableDetectors] = useState<string[]>([]);
    const [isFetchingList, setIsFetchingList] = useState(false);

    const [isRunning, setIsRunning] = useState(false);
    const [runId, setRunId] = useState<string | null>(null);
    const [logs, setLogs] = useState("");
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState<string | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (runId && (status === "running" || status === "idle")) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/garak/status?runId=${runId}`);
                    const data = await res.json();

                    if (data.logs) setLogs(data.logs);
                    if (data.status) setStatus(data.status);
                    if (data.error) setError(data.error);

                    if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
                        setIsRunning(false);
                        clearInterval(interval);
                    }
                } catch (e) {
                    console.error("Error polling status:", e);
                }
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [runId, status]);

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsRunning(true);
        setLogs("");
        setError(null);
        setStatus("running");

        // Combine selected and custom probes/detectors
        const allProbes = [...selectedProbes];
        if (customProbes) allProbes.push(...customProbes.split(",").map(s => s.trim()));

        const allDetectors = [...selectedDetectors];
        if (customDetectors) allDetectors.push(...customDetectors.split(",").map(s => s.trim()));

        try {
            const res = await fetch("/api/garak/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider,
                    model_name: modelName,
                    api_key: apiKey,
                    probes: allProbes.join(","),
                    detectors: allDetectors.join(","),
                    generations,
                    seed: seed === "" ? undefined : Number(seed),

                    garakCommand,
                    // REST Config
                    restConfig: provider === 'rest' ? {
                        uri: restUri,
                        method: restMethod,
                        headers: restHeaders,
                        req_template: restReqTemplate,
                        req_template_json_object: restReqTemplateJson,
                        response_json: restResponseJson,
                        response_json_field: restResponseJsonField,
                        request_timeout: restRequestTimeout,
                        ratelimit_codes: restRateLimitCodes,
                        skip_codes: restSkipCodes,
                        verify_ssl: restVerifySsl,
                        proxies: restProxies
                    } : undefined
                }),
            });

            const data = await res.json();
            if (data.error) {
                setError(data.error);
                setIsRunning(false);
            } else {
                setRunId(data.runId);
            }
        } catch (e) {
            setError(String(e));
            setIsRunning(false);
        }
    };

    const handleCancel = async () => {
        if (!runId) return;
        try {
            await fetch("/api/garak/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ runId }),
            });
        } catch (e) {
            console.error("Error cancelling:", e);
        }
    };

    const fetchAvailable = async (type: 'probes' | 'detectors') => {
        setIsFetchingList(true);
        try {
            const res = await fetch(`/api/garak/list?type=${type}&command=${encodeURIComponent(garakCommand)}`);
            const data = await res.json();
            if (data.items) {
                if (type === 'probes') setAvailableProbes(data.items);
                else setAvailableDetectors(data.items);
            }
        } catch (e) {
            console.error(`Failed to fetch ${type}:`, e);
        } finally {
            setIsFetchingList(false);
        }
    };

    const toggleProbe = (probe: string) => {
        if (selectedProbes.includes(probe)) {
            setSelectedProbes(selectedProbes.filter(p => p !== probe));
        } else {
            setSelectedProbes([...selectedProbes, probe]);
        }
    };

    const toggleDetector = (detector: string) => {
        if (selectedDetectors.includes(detector)) {
            setSelectedDetectors(selectedDetectors.filter(d => d !== detector));
        } else {
            setSelectedDetectors([...selectedDetectors, detector]);
        }
    };


    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8 flex items-center justify-between">
                <div className="min-h-screen pb-20">
                    {/* Header */}
                    <div className="text-center mb-12 pt-8">
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 dark:from-blue-400 dark:via-violet-400 dark:to-blue-400 mb-4 animate-gradient-x">
                            New Security Scan
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Configure and launch a vulnerability assessment for your LLM.
                        </p>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Configuration Column */}
                            <div className="lg:col-span-7 space-y-8">
                                <form onSubmit={handleStart} className="space-y-8">

                                    {/* Provider Selection */}
                                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-white/5">
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs">1</span>
                                                Target Model
                                            </h2>
                                        </div>
                                        <div className="p-6 space-y-6">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider text-xs">Provider</label>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {PROVIDERS.map((p) => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => setProvider(p.id)}
                                                            className={`
                                                        relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                                                        ${provider === p.id
                                                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10'
                                                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800'}
                                                    `}
                                                        >
                                                            <span className={`text-sm font-semibold ${provider === p.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                {p.name}
                                                            </span>
                                                            {provider === p.id && (
                                                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500"></div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Model & Key Inputs */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {provider !== 'rest' && (
                                                    <div className="col-span-2 md:col-span-1">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Model Name</label>
                                                        <input
                                                            type="text"
                                                            value={modelName}
                                                            onChange={(e) => setModelName(e.target.value)}
                                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                                            placeholder="e.g. gpt2, meta-llama/Llama-2-7b"
                                                            disabled={isRunning}
                                                        />
                                                    </div>
                                                )}

                                                {selectedProvider?.needsKey && (
                                                    <div className="col-span-2 md:col-span-1">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            API Key {selectedProvider?.envVar && <span className="text-xs text-gray-500 font-normal">(or set {selectedProvider.envVar})</span>}
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={apiKey}
                                                            onChange={(e) => setApiKey(e.target.value)}
                                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                                            placeholder="sk-..."
                                                            disabled={isRunning}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* REST Configuration Section */}
                                    {provider === 'rest' && (
                                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-slate-800">
                                            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">REST Configuration</h2>

                                            {/* Helper / Parser Section */}
                                            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-800">
                                                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Request Parser: Paste Raw Request</h3>
                                                <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                                                    Paste a raw HTTP request (from Burp Suite or similar) below to auto-fill fields.
                                                    After parsing, <strong>you must replace the prompt text with <code>$INPUT</code></strong> in the Template fields.
                                                </p>
                                                <textarea
                                                    value={rawRequest}
                                                    onChange={(e) => setRawRequest(e.target.value)}
                                                    className="w-full px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white font-mono text-xs mb-2"
                                                    rows={5}
                                                    placeholder={`POST /v1/chat/completions HTTP/1.1\nHost: api.example.com\nContent-Type: application/json\nAuthorization: Bearer sk-...\n\n{\n  "model": "gpt-3.5",\n  "messages": [{"role": "user", "content": "Hello"}]\n}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={parseRawRequest}
                                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
                                                >
                                                    Auto-Fill Configuration
                                                </button>
                                            </div>

                                            {/* Response Parser Section */}
                                            <div className="mb-6 bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-100 dark:border-green-800">
                                                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Response Parser: Paste Sample Response</h3>
                                                <p className="text-xs text-green-600 dark:text-green-400 mb-2">
                                                    Paste a sample JSON response from your API to auto-detect the <strong>Response JSON Field</strong>.
                                                </p>
                                                <textarea
                                                    value={sampleResponse}
                                                    onChange={(e) => setSampleResponse(e.target.value)}
                                                    className="w-full px-3 py-2 border border-green-200 dark:border-green-700 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-800 dark:text-white font-mono text-xs mb-2"
                                                    rows={4}
                                                    placeholder={`{\n  "response": "Hello! How can I help you?",\n  "session_id": "abc-123"\n}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={parseResponseJson}
                                                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors"
                                                >
                                                    Detect Fields
                                                </button>

                                                {detectedFields.length > 0 && (
                                                    <div className="mt-3 border-t border-green-200 dark:border-green-700 pt-3">
                                                        <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2">Click a field to use it:</p>
                                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                                            {detectedFields.map((field, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setRestResponseJsonField(field.path);
                                                                        setDetectedFields([]);
                                                                        setSampleResponse("");
                                                                    }}
                                                                    className="w-full text-left px-2 py-1.5 text-xs rounded bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                                                >
                                                                    <span className="font-mono font-semibold text-green-700 dark:text-green-400">{field.path}</span>
                                                                    <span className="text-gray-500 dark:text-gray-400 ml-2">→ &quot;{field.value}&quot;</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expanded Pentester Guide */}
                                            <details className="mb-6 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                                                <summary className="text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
                                                    📖 How to Configure (Pentester Guide)
                                                </summary>
                                                <div className="mt-4 text-xs text-gray-700 dark:text-gray-300 space-y-4">

                                                    {/* URI */}
                                                    <div className="border-l-2 border-blue-500 pl-3">
                                                        <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">1. URI</p>
                                                        <p className="mt-1">The full URL endpoint of your chatbot API.</p>
                                                        <div className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-xs">
                                                            http://localhost:8000/sessions/abc-123/messages<br />
                                                            https://api.example.com/v1/chat/completions
                                                        </div>
                                                    </div>

                                                    {/* Method */}
                                                    <div className="border-l-2 border-blue-500 pl-3">
                                                        <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">2. Method</p>
                                                        <p className="mt-1">Usually <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">POST</code> for sending messages to a chatbot.</p>
                                                    </div>

                                                    {/* Headers */}
                                                    <div className="border-l-2 border-blue-500 pl-3">
                                                        <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">3. Headers (JSON)</p>
                                                        <p className="mt-1">HTTP headers in JSON format. Essential headers usually include:</p>
                                                        <div className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-xs overflow-x-auto">
                                                            {`{
  "Content-Type": "application/json",
  "Cookie": "session=abc123",
  "Authorization": "Bearer $KEY"
}`}
                                                        </div>
                                                        <p className="mt-1 text-gray-500">Use <code>$KEY</code> as placeholder if you set an API key above.</p>
                                                    </div>

                                                    {/* Request Template vs JSON */}
                                                    <div className="border-l-2 border-orange-500 pl-3">
                                                        <p className="font-semibold text-sm text-orange-700 dark:text-orange-400">4. Request Template vs Request Template JSON</p>
                                                        <p className="mt-1 font-medium">⚠️ Use ONLY ONE of these fields:</p>

                                                        <div className="mt-2 grid gap-2">
                                                            <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-800">
                                                                <p className="font-semibold">Request Template JSON (Recommended for JSON APIs)</p>
                                                                <p className="text-gray-600 dark:text-gray-400 mt-1">Use when your API accepts JSON body. Put <code>$INPUT</code> where the user message goes.</p>
                                                                <div className="mt-1 bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-xs">
                                                                    {`{"message": "$INPUT"}`}
                                                                </div>
                                                            </div>

                                                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">
                                                                <p className="font-semibold">Request Template (Plain text)</p>
                                                                <p className="text-gray-600 dark:text-gray-400 mt-1">Use only for plain-text request bodies or simple strings.</p>
                                                                <div className="mt-1 bg-white dark:bg-gray-900 p-2 rounded font-mono text-xs">
                                                                    $INPUT
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Response JSON Field */}
                                                    <div className="border-l-2 border-green-500 pl-3">
                                                        <p className="font-semibold text-sm text-green-700 dark:text-green-400">5. Response JSON Field</p>
                                                        <p className="mt-1">The dot-notation path to extract the bot&apos;s response text from the JSON.</p>

                                                        <table className="mt-2 w-full text-xs border border-gray-300 dark:border-gray-600 rounded">
                                                            <thead className="bg-gray-100 dark:bg-gray-800">
                                                                <tr>
                                                                    <th className="px-2 py-1 text-left border-b border-gray-300 dark:border-gray-600">Response JSON</th>
                                                                    <th className="px-2 py-1 text-left border-b border-gray-300 dark:border-gray-600">Field Value</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                                                    <td className="px-2 py-1 font-mono">{`{"response": "Hi"}`}</td>
                                                                    <td className="px-2 py-1 font-mono text-green-600">response</td>
                                                                </tr>
                                                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                                                    <td className="px-2 py-1 font-mono">{`{"data": {"text": "Hi"}}`}</td>
                                                                    <td className="px-2 py-1 font-mono text-green-600">data.text</td>
                                                                </tr>
                                                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                                                    <td className="px-2 py-1 font-mono">{`{"choices": [{"message": {"content": "Hi"}}]}`}</td>
                                                                    <td className="px-2 py-1 font-mono text-green-600">choices.0.message.content</td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="px-2 py-1 font-mono">{`{"output": "Hi", "meta": {...}}`}</td>
                                                                    <td className="px-2 py-1 font-mono text-green-600">output</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                        <p className="mt-2 text-green-600 dark:text-green-400">💡 Tip: Use the &quot;Paste Sample Response&quot; helper above to auto-detect this!</p>
                                                    </div>

                                                    {/* Common Examples */}
                                                    <div className="border-l-2 border-purple-500 pl-3">
                                                        <p className="font-semibold text-sm text-purple-700 dark:text-purple-400">Common API Examples</p>

                                                        <details className="mt-2">
                                                            <summary className="cursor-pointer hover:text-purple-600 font-medium">OpenAI-style API</summary>
                                                            <div className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-xs space-y-2">
                                                                <p><strong>Request Template JSON:</strong></p>
                                                                <pre className="overflow-x-auto">{`{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "$INPUT"}]}`}</pre>
                                                                <p><strong>Response JSON Field:</strong> <code className="text-green-600">choices.0.message.content</code></p>
                                                            </div>
                                                        </details>

                                                        <details className="mt-2">
                                                            <summary className="cursor-pointer hover:text-purple-600 font-medium">Simple Chatbot</summary>
                                                            <div className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-xs space-y-2">
                                                                <p><strong>Request Template JSON:</strong></p>
                                                                <pre className="overflow-x-auto">{`{"message": "$INPUT"}`}</pre>
                                                                <p><strong>Response JSON Field:</strong> <code className="text-green-600">response</code></p>
                                                            </div>
                                                        </details>

                                                        <details className="mt-2">
                                                            <summary className="cursor-pointer hover:text-purple-600 font-medium">Agentic System (with intermediate_steps)</summary>
                                                            <div className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-xs space-y-2">
                                                                <p><strong>Request Template JSON:</strong></p>
                                                                <pre className="overflow-x-auto">{`{"message": "$INPUT"}`}</pre>
                                                                <p><strong>Response JSON Field:</strong> <code className="text-green-600">response</code></p>
                                                                <p className="text-gray-500">(The intermediate_steps are internal tool calls, the final &quot;response&quot; is what you test)</p>
                                                            </div>
                                                        </details>
                                                    </div>

                                                </div>
                                            </details>


                                            <div className="mb-4">
                                                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    URI <Tooltip text="The URI of the REST endpoint. Can also be passed in --target_name." />
                                                </label>
                                                <input
                                                    type="text"
                                                    value={restUri}
                                                    onChange={(e) => setRestUri(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                    placeholder="https://api.example.com/v1/chat"
                                                    disabled={isRunning}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Method <Tooltip text="HTTP method to use (default: post)." />
                                                    </label>
                                                    <select
                                                        value={restMethod}
                                                        onChange={(e) => setRestMethod(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white uppercase"
                                                        disabled={isRunning}
                                                    >
                                                        <option value="get">GET</option>
                                                        <option value="post">POST</option>
                                                        <option value="put">PUT</option>
                                                        <option value="delete">DELETE</option>
                                                        <option value="patch">PATCH</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Timeout (s) <Tooltip text="Seconds to wait before timing out (default: 20)." />
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={restRequestTimeout}
                                                        onChange={(e) => setRestRequestTimeout(Number(e.target.value))}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                        disabled={isRunning}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Headers (JSON) <Tooltip text="HTTP headers to send with the request. Use $KEY for API key." />
                                                </label>
                                                <textarea
                                                    value={restHeaders}
                                                    onChange={(e) => setRestHeaders(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                                                    rows={3}
                                                    placeholder='{"Authorization": "Bearer $KEY", "Content-Type": "application/json"}'
                                                    disabled={isRunning}
                                                />
                                            </div>
                                            {/* Request Body Type Toggle */}
                                            <div className="mb-4">
                                                <div className="flex items-center mb-3">
                                                    <input
                                                        type="checkbox"
                                                        id="useJsonBody"
                                                        checked={useJsonBody}
                                                        onChange={(e) => setUseJsonBody(e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                        disabled={isRunning}
                                                    />
                                                    <label htmlFor="useJsonBody" className="ml-2 flex items-center text-sm font-medium text-gray-900 dark:text-gray-300">
                                                        Request Body is JSON <Tooltip text="Check this if your API expects a JSON body (most chatbots do). Uncheck for plain text." />
                                                    </label>
                                                </div>

                                                {useJsonBody ? (
                                                    <div>
                                                        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Request Body JSON <Tooltip text="Your JSON request body. Put $INPUT where the user message goes." />
                                                        </label>
                                                        <textarea
                                                            value={restReqTemplateJson}
                                                            onChange={(e) => setRestReqTemplateJson(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                                                            rows={3}
                                                            placeholder='{"message": "$INPUT"}'
                                                            disabled={isRunning}
                                                        />
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Replace the user message with <code>$INPUT</code>.
                                                            Example: <code>{`{"message": "$INPUT"}`}</code>
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Request Body (Plain Text) <Tooltip text="Plain text request body. $INPUT is replaced by the probe prompt." />
                                                        </label>
                                                        <textarea
                                                            value={restReqTemplate}
                                                            onChange={(e) => setRestReqTemplate(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                                                            rows={2}
                                                            placeholder="$INPUT"
                                                            disabled={isRunning}
                                                        />
                                                        <p className="mt-1 text-xs text-gray-500">Use <code>$INPUT</code> as placeholder for the probe prompt.</p>
                                                    </div>
                                                )}
                                            </div>


                                            {/* Response Configuration */}
                                            <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Response Configuration</h3>

                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Response Format <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="flex items-center space-x-4">
                                                        <label className="flex items-center">
                                                            <input
                                                                type="radio"
                                                                checked={restResponseJson}
                                                                onChange={() => setRestResponseJson(true)}
                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                                disabled={isRunning}
                                                            />
                                                            <span className="ml-2 text-sm text-gray-900 dark:text-gray-300">JSON</span>
                                                        </label>
                                                        <label className="flex items-center">
                                                            <input
                                                                type="radio"
                                                                checked={!restResponseJson}
                                                                onChange={() => setRestResponseJson(false)}
                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                                disabled={isRunning}
                                                            />
                                                            <span className="ml-2 text-sm text-gray-900 dark:text-gray-300">Plain Text</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {restResponseJson ? (
                                                    <div className="mb-2">
                                                        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Response JSON Field <span className="text-red-500 ml-1">*</span> <Tooltip text="Crucial! The field where the bot's response text is located." />
                                                        </label>
                                                        <div className="relative rounded-md shadow-sm">
                                                            <input
                                                                type="text"
                                                                value={restResponseJsonField}
                                                                onChange={(e) => setRestResponseJsonField(e.target.value)}
                                                                className={`w-full px-3 py-2 border ${!restResponseJsonField && status !== 'running' ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white`}
                                                                placeholder="e.g. choices.0.message.content"
                                                                disabled={isRunning}
                                                                required
                                                            />
                                                        </div>
                                                        {!restResponseJsonField && (
                                                            <p className="mt-1 text-xs text-red-500 animate-pulse">
                                                                ⚠️ You MUST specify where to find the response text.
                                                            </p>
                                                        )}
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Use dot notation for nested fields. Example: <code>response</code> or <code>data.text</code>.
                                                            <br />
                                                            <span className="text-green-600 dark:text-green-400">Tip: Use the &quot;Paste Sample Response&quot; helper above to auto-fill this.</span>
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-800 dark:text-yellow-200">
                                                        ⚠️ Only use Plain Text if your API returns raw text (not JSON). Most APIs return JSON.
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mb-4">
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={restVerifySsl}
                                                        onChange={(e) => setRestVerifySsl(e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                        disabled={isRunning}
                                                    />
                                                    <label className="ml-2 flex items-center text-sm text-gray-900 dark:text-gray-300">
                                                        Verify SSL <Tooltip text="Enforce SSL certificate validation (default: True)." />
                                                    </label>
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500 ml-6">
                                                    Uncheck this if you are testing a localhost server with a self-signed certificate.
                                                </p>
                                            </div>


                                            <details className="mb-4">
                                                <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600">Advanced Options</summary>
                                                <div className="mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-4">
                                                    <div>
                                                        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Rate Limit Codes <Tooltip text="HTTP codes to treat as rate limiting and retry (default: [429])." />
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={restRateLimitCodes}
                                                            onChange={(e) => setRestRateLimitCodes(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                                                            placeholder="[429]"
                                                            disabled={isRunning}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Skip Codes <Tooltip text="HTTP codes to treat as failed generation and skip." />
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={restSkipCodes}
                                                            onChange={(e) => setRestSkipCodes(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                                                            placeholder="[]"
                                                            disabled={isRunning}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Proxies (JSON) <Tooltip text="Dict passed to requests method call." />
                                                        </label>
                                                        <textarea
                                                            value={restProxies}
                                                            onChange={(e) => setRestProxies(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                                                            rows={2}
                                                            placeholder='{"http": "http://10.10.1.10:3128"}'
                                                            disabled={isRunning}
                                                        />
                                                    </div>
                                                </div>
                                            </details>
                                        </div>
                                    )}

                                    {/* Scanners Section */}
                                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs">2</span>
                                                Scanners
                                            </h2>
                                            <button
                                                type="button"
                                                onClick={() => { fetchAvailable('probes'); fetchAvailable('detectors'); }}
                                                disabled={isFetchingList || isRunning}
                                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
                                            >
                                                {isFetchingList ? 'Refreshing...' : 'Refresh List'}
                                            </button>
                                        </div>

                                        <div className="p-6 space-y-6">
                                            {/* Probes */}
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider text-xs">Active Probes</label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                                    {Object.entries(PROBE_CATEGORIES).map(([category, probes]) => (
                                                        <div key={category} className="space-y-2">
                                                            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase flex items-center gap-2">
                                                                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                                                                {category}
                                                                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {probes.map(probe => (
                                                                    <label key={probe} className={`
                                                                        flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-all
                                                                        ${selectedProbes.includes(probe)
                                                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'}
                                                                    `}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedProbes.includes(probe)}
                                                                            onChange={() => toggleProbe(probe)}
                                                                            disabled={isRunning}
                                                                            className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 border-gray-300"
                                                                        />
                                                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono truncate" title={probe}>{probe}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Fetched Probes */}
                                                    {availableProbes.length > 0 && availableProbes.some(p => !Object.values(PROBE_CATEGORIES).flat().includes(p)) && (
                                                        <div className="space-y-2">
                                                            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase flex items-center gap-2">
                                                                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                                                                Discovered
                                                                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {availableProbes.filter(p => !Object.values(PROBE_CATEGORIES).flat().includes(p)).map(probe => (
                                                                    <label key={probe} className={`
                                                                        flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-all
                                                                        ${selectedProbes.includes(probe)
                                                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'}
                                                                    `}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedProbes.includes(probe)}
                                                                            onChange={() => toggleProbe(probe)}
                                                                            disabled={isRunning}
                                                                            className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 border-gray-300"
                                                                        />
                                                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono truncate" title={probe}>{probe}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={customProbes}
                                                    onChange={(e) => setCustomProbes(e.target.value)}
                                                    className="mt-3 w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                                    placeholder="Add custom probes (comma separated)..."
                                                    disabled={isRunning}
                                                />
                                            </div>

                                            {/* Detectors */}
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider text-xs">Active Detectors</label>
                                                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                    {DETECTORS.map(detector => (
                                                        <label key={detector} className={`
                                                            flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-all
                                                            ${selectedDetectors.includes(detector)
                                                                ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20'
                                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'}
                                                        `}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDetectors.includes(detector)}
                                                                onChange={() => toggleDetector(detector)}
                                                                disabled={isRunning}
                                                                className="rounded text-purple-600 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 border-gray-300"
                                                            />
                                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono truncate" title={detector}>{detector}</span>
                                                        </label>
                                                    ))}
                                                    {availableDetectors.filter(d => !DETECTORS.includes(d)).map(detector => (
                                                        <label key={detector} className={`
                                                            flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-all
                                                            ${selectedDetectors.includes(detector)
                                                                ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20'
                                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'}
                                                        `}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDetectors.includes(detector)}
                                                                onChange={() => toggleDetector(detector)}
                                                                disabled={isRunning}
                                                                className="rounded text-purple-600 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 border-gray-300"
                                                            />
                                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono truncate" title={detector}>{detector}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={customDetectors}
                                                    onChange={(e) => setCustomDetectors(e.target.value)}
                                                    className="mt-3 w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:text-white"
                                                    placeholder="Add custom detectors (comma separated)..."
                                                    disabled={isRunning}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced Configuration */}
                                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-white/5">
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs">3</span>
                                                Parameters
                                            </h2>
                                        </div>
                                        <div className="p-6 grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Generations per Probe</label>
                                                <input
                                                    type="number"
                                                    value={generations}
                                                    onChange={(e) => setGenerations(Number(e.target.value))}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                                    min="1"
                                                    disabled={isRunning}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Random Seed</label>
                                                <input
                                                    type="number"
                                                    value={seed}
                                                    onChange={(e) => setSeed(e.target.value === "" ? "" : Number(e.target.value))}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                                    placeholder="Random"
                                                    disabled={isRunning}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Garak Command</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={garakCommand}
                                                        onChange={(e) => setGarakCommand(e.target.value)}
                                                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                                        placeholder="python3 -m garak"
                                                        disabled={isRunning}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono border border-gray-200 dark:border-gray-700 px-2 py-1 rounded">CMD</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!isRunning ? (
                                        <button
                                            type="submit"
                                            className="w-full group relative flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white py-4 px-8 rounded-2xl shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] font-bold text-lg"
                                        >
                                            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            </span>
                                            Launch Security Scan
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            className="w-full group flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 text-white py-4 px-8 rounded-2xl shadow-lg shadow-red-500/25 transition-all transform hover:scale-[1.02] font-bold text-lg"
                                        >
                                            <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Stop Active Scan
                                        </button>
                                    )}
                                </form>
                            </div>

                            {/* Execution View */}
                            <div className="lg:col-span-5">
                                <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 ring-1 ring-white/10 flex flex-col h-[calc(100vh-140px)] sticky top-24">
                                    {/* Terminal Header */}
                                    <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-gray-800 select-none">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors"></div>
                                                <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors"></div>
                                                <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors"></div>
                                            </div>
                                            <div className="ml-4 text-xs font-mono text-gray-500 flex items-center gap-2 group">
                                                <svg className="w-3 h-3 text-gray-700 group-hover:text-blue-500/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                                </svg>
                                                <span className="text-gray-600 group-hover:text-gray-400 transition-colors">garak-cli</span>
                                                <span className="text-gray-700">~</span>
                                            </div>
                                        </div>
                                        <div className={`
                                            flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                            ${status === 'running' ? 'bg-blue-500/10 text-blue-400 animate-pulse ring-1 ring-blue-500/20' :
                                                status === 'completed' ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20' :
                                                    status === 'failed' ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20' :
                                                        'bg-gray-800 text-gray-500 border border-gray-700'}
                                        `}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${status === 'running' ? 'bg-blue-400' :
                                                status === 'completed' ? 'bg-green-400' :
                                                    status === 'failed' ? 'bg-red-400' : 'bg-gray-500'
                                                }`}></div>
                                            {status}
                                        </div>
                                    </div>

                                    {/* Terminal Body */}
                                    <div className="flex-1 p-6 overflow-auto custom-scrollbar font-mono text-sm leading-relaxed relative group bg-[#0c0c0e]">
                                        <div className="absolute inset-0 bg-[url('/grid-dark.svg')] opacity-[0.03] pointer-events-none"></div>

                                        {logs ? (
                                            <pre className="whitespace-pre-wrap text-gray-300 relative z-10 selection:bg-blue-500/30 selection:text-white pb-10">
                                                {logs}
                                                {status === 'running' && <span className="inline-block w-2 h-4 bg-gray-500 animate-pulse ml-1 align-middle"></span>}
                                            </pre>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-4 select-none">
                                                <div className="w-20 h-20 rounded-3xl bg-gray-900/50 flex items-center justify-center ring-1 ring-white/5">
                                                    <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-medium text-gray-500">System Ready</p>
                                                    <p className="text-xs text-gray-700 mt-1">Configure parameters to initialize scan</p>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={logEndRef} />
                                    </div>

                                    {/* Action Footer (for completed runs) */}
                                    {status === "completed" && runId && (
                                        <div className="p-4 bg-slate-950 border-t border-gray-800">
                                            <Link
                                                href={`/runs/${runId}`}
                                                className="block w-full text-center bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30 text-sm tracking-wide uppercase"
                                            >
                                                View Analysis Report
                                            </Link>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="p-4 bg-red-950/30 border-t border-red-900/50 text-red-400 text-xs font-mono">
                                            <span className="font-bold text-red-500">[ERROR]</span> {error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
