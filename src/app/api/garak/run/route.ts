import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { RunInfo } from "@/lib/garak/types";

const DATA_DIR = path.join(process.cwd(), "data");
const RUNS_FILE = path.join(DATA_DIR, "active_runs.json");
const LOGS_DIR = path.join(DATA_DIR, "logs");
const CONFIGS_DIR = path.join(DATA_DIR, "configs");

// SECURITY: Use server-side configuration only via environment variables
// This prevents command injection attacks from user-controlled input
const GARAK_COMMAND = process.env.GARAK_COMMAND || "python";
const GARAK_MODULE = process.env.GARAK_MODULE || "garak";

// Validation patterns for user inputs that will be passed as command arguments
const SAFE_MODEL_NAME_PATTERN = /^[a-zA-Z0-9._\-\/:]+$/;
const SAFE_PROBE_PATTERN = /^[a-zA-Z0-9._,\-]+$/;
const SAFE_PROVIDER_PATTERN = /^[a-zA-Z0-9._\-]+$/;

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
if (!fs.existsSync(CONFIGS_DIR)) fs.mkdirSync(CONFIGS_DIR, { recursive: true });

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // SECURITY: Removed garakCommand from user input - now configured via environment variables
        const { provider, model_name, api_key, probes, detectors, generations, seed, restConfig } = body;

        if (!model_name && provider !== 'rest') {
            return NextResponse.json({ error: "Model name is required" }, { status: 400 });
        }

        // SECURITY: Validate all user inputs that will be used in command arguments
        if (model_name && !SAFE_MODEL_NAME_PATTERN.test(model_name)) {
            return NextResponse.json({ error: "Invalid model name format. Only alphanumeric characters, dots, dashes, underscores, colons, and slashes are allowed." }, { status: 400 });
        }
        if (provider && !SAFE_PROVIDER_PATTERN.test(provider)) {
            return NextResponse.json({ error: "Invalid provider format." }, { status: 400 });
        }
        if (probes && !SAFE_PROBE_PATTERN.test(probes)) {
            return NextResponse.json({ error: "Invalid probes format. Only alphanumeric characters, dots, commas, dashes, and underscores are allowed." }, { status: 400 });
        }
        if (detectors && !SAFE_PROBE_PATTERN.test(detectors)) {
            return NextResponse.json({ error: "Invalid detectors format. Only alphanumeric characters, dots, commas, dashes, and underscores are allowed." }, { status: 400 });
        }
        if (generations !== undefined && (typeof generations !== 'number' || generations < 1 || generations > 10000 || !Number.isInteger(generations))) {
            return NextResponse.json({ error: "Invalid generations value. Must be an integer between 1 and 10000." }, { status: 400 });
        }
        if (seed !== undefined && seed !== "" && seed !== null && (typeof seed !== 'number' || !Number.isInteger(seed))) {
            return NextResponse.json({ error: "Invalid seed value. Must be an integer." }, { status: 400 });
        }

        const runId = uuidv4();
        const logFile = path.join(LOGS_DIR, `${runId}.log`);
        const reportPrefix = `garak_${runId}`;

        // SECURITY: Use fixed command structure from environment variables, not user input
        const command = GARAK_COMMAND;
        const initialArgs = ["-m", GARAK_MODULE];

        // Construct command args
        const args = [...initialArgs];

        // Add model args
        // Add model args
        if (provider === "rest") {
            // Handle REST provider
            if (!restConfig) {
                return NextResponse.json({ error: "REST configuration is missing" }, { status: 400 });
            }

            const configFile = path.join(CONFIGS_DIR, `${runId}.json`);

            // Parse headers and template JSON if provided
            let headers = {};
            try {
                if (restConfig.headers) headers = JSON.parse(restConfig.headers);
            } catch (e) {
                console.error("Failed to parse headers JSON", e);
            }

            let reqTemplateJson = undefined;
            try {
                if (restConfig.req_template_json_object) reqTemplateJson = JSON.parse(restConfig.req_template_json_object);
            } catch (e) {
                console.error("Failed to parse req_template_json_object", e);
            }

            let ratelimitCodes = [429];
            try {
                if (restConfig.ratelimit_codes) ratelimitCodes = JSON.parse(restConfig.ratelimit_codes);
            } catch (e) {
                console.error("Failed to parse ratelimit_codes", e);
            }

            let skipCodes = [];
            try {
                if (restConfig.skip_codes) skipCodes = JSON.parse(restConfig.skip_codes);
            } catch (e) {
                console.error("Failed to parse skip_codes", e);
            }

            let proxies = undefined;
            try {
                if (restConfig.proxies) proxies = JSON.parse(restConfig.proxies);
            } catch (e) {
                console.error("Failed to parse proxies", e);
            }

            const config = {
                rest: {
                    RestGenerator: {
                        name: restConfig.uri, // Use URI as name if not provided
                        uri: restConfig.uri,
                        method: restConfig.method,
                        headers: headers,
                        req_template: restConfig.req_template,
                        req_template_json_object: reqTemplateJson,
                        response_json: restConfig.response_json,
                        response_json_field: restConfig.response_json_field,
                        request_timeout: restConfig.request_timeout,
                        ratelimit_codes: ratelimitCodes,
                        skip_codes: skipCodes,
                        verify_ssl: restConfig.verify_ssl,
                        proxies: proxies
                    }
                }
            };

            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

            args.push("--model_type", "rest");
            args.push("-G", configFile);

        } else if (provider && provider !== "huggingface") {
            args.push("--model_type", provider);
            args.push("--model_name", model_name);
        } else {
            // Default behavior or explicit huggingface (local)
            args.push("--model_type", "huggingface");
            args.push("--model_name", model_name);
        }

        if (probes) args.push("--probes", probes);
        if (detectors) args.push("--detectors", detectors);
        if (generations) args.push("--generations", String(generations));
        if (seed !== undefined && seed !== "") args.push("--seed", String(seed));

        // Add report prefix to easily find the output later
        args.push("--report_prefix", reportPrefix);

        // Prepare Environment Variables
        const env: NodeJS.ProcessEnv = {
            ...process.env,
            PYTHONUNBUFFERED: "1", // Force unbuffered output for real-time streaming
        };

        if (api_key) {
            if (provider === "openai") env.OPENAI_API_KEY = api_key;
            else if (provider === "huggingface.InferenceAPI") env.HF_INFERENCE_TOKEN = api_key;
            else if (provider === "replicate") env.REPLICATE_API_TOKEN = api_key;
            else if (provider === "cohere") env.COHERE_API_KEY = api_key;
            else if (provider === "groq") env.GROQ_API_KEY = api_key;
            else if (provider === "nim") env.NIM_API_KEY = api_key;
        }

        console.log(`Starting garak run ${runId} with command: ${command} ${args.join(" ")}`);

        // Spawn process
        const child = spawn(command, args, {
            cwd: process.cwd(), // Run in project root so it saves reports there by default or we can specify output dir
            detached: false, // Changed to false to avoid popup window issues on Windows
            stdio: ["ignore", "pipe", "pipe"],
            shell: true, // Use shell to ensure commands like 'garak' (which might be .bat/.cmd) are resolved correctly
            env: env, // Pass environment variables
        });

        if (!child.pid) {
            return NextResponse.json({ error: "Failed to spawn process" }, { status: 500 });
        }

        const logStream = fs.createWriteStream(logFile);
        child.stdout.pipe(logStream);
        child.stderr.pipe(logStream);

        // Save run info
        const runInfo: RunInfo = {
            runId,
            pid: child.pid,
            status: "running",
            startTime: Date.now(),
            model: model_name, // Use model_name as the model identifier
            probes,
            detectors,
            reportPrefix,
            logFile,
        };

        let activeRuns: Record<string, RunInfo> = {};
        if (fs.existsSync(RUNS_FILE)) {
            try {
                activeRuns = JSON.parse(fs.readFileSync(RUNS_FILE, "utf-8"));
            } catch (e) {
                console.error("Error reading active runs:", e);
            }
        }
        activeRuns[runId] = runInfo;
        fs.writeFileSync(RUNS_FILE, JSON.stringify(activeRuns, null, 2));

        // Unref to allow parent to exit if needed, though Next.js server stays up
        child.unref();

        return NextResponse.json({ success: true, runId });
    } catch (error) {
        console.error("Error starting run:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
