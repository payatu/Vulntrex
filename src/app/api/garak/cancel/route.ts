import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { RunInfo } from "@/lib/garak/types";

const DATA_DIR = path.join(process.cwd(), "data");
const RUNS_FILE = path.join(DATA_DIR, "active_runs.json");

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { runId } = body;

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

        if (run.status === "running") {
            try {
                process.kill(run.pid);
                run.status = "cancelled";
                run.endTime = Date.now();
                run.error = "Cancelled by user";

                activeRuns[runId] = run;
                fs.writeFileSync(RUNS_FILE, JSON.stringify(activeRuns, null, 2));

                return NextResponse.json({ success: true });
            } catch (e) {
                console.error("Error killing process:", e);
                return NextResponse.json({ error: "Failed to cancel run" }, { status: 500 });
            }
        } else {
            return NextResponse.json({ error: "Run is not running" }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
