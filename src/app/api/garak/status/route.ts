import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { parseGarakReport } from "@/lib/garak/parse";
import { RunInfo } from "@/lib/garak/types";

const DATA_DIR = path.join(process.cwd(), "data");
const RUNS_FILE = path.join(DATA_DIR, "active_runs.json");

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const runId = searchParams.get("runId");

    if (!runId) {
        return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }

    if (!fs.existsSync(RUNS_FILE)) {
        return NextResponse.json({ error: "No active runs found" }, { status: 404 });
    }

    let activeRuns: Record<string, RunInfo> = {};
    try {
        activeRuns = JSON.parse(fs.readFileSync(RUNS_FILE, "utf-8"));
    } catch {
        return NextResponse.json({ error: "Failed to read active runs" }, { status: 500 });
    }

    const run = activeRuns[runId];
    if (!run) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Read logs
    let logs = "";
    if (run.logFile && fs.existsSync(run.logFile)) {
        logs = fs.readFileSync(run.logFile, "utf-8");
    }

    // Check process status if marked as running
    if (run.status === "running") {
        let isRunning = true;
        try {
            // process.kill(pid, 0) checks if process exists without killing it
            process.kill(run.pid, 0);
        } catch {
            isRunning = false;
        }

        if (!isRunning) {
            // Process finished. Determine success/failure and look for report.
            run.status = "completed"; // Assume completed, verify below
            run.endTime = Date.now();

            // Look for report file
            // Garak might append things to the filename, so we look for files starting with the prefix
            const cwd = process.cwd();
            const defaultGarakDir = path.join(os.homedir(), ".local", "share", "garak", "garak_runs");
            console.log("defaultGarakDir", defaultGarakDir);
            let reportPath: string | null = null;
            let hitlogPath: string | null = null;

            // Check CWD first
            let files = fs.readdirSync(cwd);
            let reportFilename = files.find(f => f.startsWith(run.reportPrefix) && f.endsWith(".report.jsonl"));
            let hitlogFilename = files.find(f => f.startsWith(run.reportPrefix) && f.endsWith(".hitlog.jsonl"));

            if (reportFilename) reportPath = path.join(cwd, reportFilename);
            if (hitlogFilename) hitlogPath = path.join(cwd, hitlogFilename);

            // If not found in CWD, check default Garak directory
            if (!reportPath && fs.existsSync(defaultGarakDir)) {
                files = fs.readdirSync(defaultGarakDir);
                reportFilename = files.find(f => f.startsWith(run.reportPrefix) && f.endsWith(".report.jsonl"));
                hitlogFilename = files.find(f => f.startsWith(run.reportPrefix) && f.endsWith(".hitlog.jsonl"));

                if (reportFilename) reportPath = path.join(defaultGarakDir, reportFilename);
                if (hitlogFilename) hitlogPath = path.join(defaultGarakDir, hitlogFilename);
            }

            if (reportPath && fs.existsSync(reportPath)) {
                try {
                    // Parse and ingest
                    const parsed = await parseGarakReport(reportPath);

                    // Move to data/runs
                    const finalRunDir = path.join(DATA_DIR, "runs", runId);
                    if (!fs.existsSync(finalRunDir)) fs.mkdirSync(finalRunDir, { recursive: true });

                    fs.writeFileSync(path.join(finalRunDir, "normalized.json"), JSON.stringify(parsed, null, 2), "utf-8");

                    // Move original files
                    fs.renameSync(reportPath, path.join(finalRunDir, "report.jsonl"));
                    if (hitlogPath && fs.existsSync(hitlogPath)) {
                        fs.renameSync(hitlogPath, path.join(finalRunDir, "hitlog.jsonl"));
                    }

                    run.status = "completed";
                    run.resultPath = `/runs/${runId}`;
                } catch (err) {
                    console.error("Error parsing report:", err);
                    run.status = "failed";
                    run.error = "Failed to parse report";
                }
            } else {
                // If no report found, maybe it failed early
                run.status = "failed";
                run.error = "No report file generated";
            }

            // Update active runs
            activeRuns[runId] = run;
            fs.writeFileSync(RUNS_FILE, JSON.stringify(activeRuns, null, 2));
        }
    }

    return NextResponse.json({
        runId: run.runId,
        status: run.status,
        logs,
        startTime: run.startTime,
        endTime: run.endTime,
        error: run.error,
        resultPath: run.resultPath
    });
}
