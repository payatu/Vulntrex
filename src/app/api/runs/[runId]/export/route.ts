
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { EnrichedAttempt, HitLogEntry, RunData } from "@/lib/garak/run-utils";
import { stringify } from "csv-stringify/sync";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ runId: string }> }
) {
    const { runId } = await params;

    const runDir = path.join(process.cwd(), "data", "runs", runId);
    const normalizedFile = path.join(runDir, "normalized.json");
    const hitlogFile = path.join(runDir, "hitlog.jsonl");

    if (!fs.existsSync(normalizedFile)) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    try {
        // Load normalized data
        const data = JSON.parse(fs.readFileSync(normalizedFile, "utf-8")) as RunData;
        const attempts = (data.attempts || []).map((a) => ({
            ...a,
            hasHit: false, // Default initialization
            hitlogData: undefined
        }));

        // Load hitlog data
        let hits: HitLogEntry[] = [];
        if (fs.existsSync(hitlogFile)) {
            try {
                const content = fs.readFileSync(hitlogFile, "utf-8");
                hits = content
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line)
                    .map((line) => {
                        try {
                            return JSON.parse(line);
                        } catch {
                            return null;
                        }
                    })
                    .filter((item): item is HitLogEntry => item !== null);
            } catch (e) {
                console.error("Failed to parse hitlog:", e);
            }
        }

        // Enhance attempts with hitlog data
        const enhancedAttempts = attempts.flatMap((a) => {
            const attemptHits = hits.filter((h) => h.attempt_id === a.uuid);

            if (a.status === 2 && attemptHits.length > 0) {
                return attemptHits.map((hitData) => ({
                    ...a,
                    hasHit: true,
                    hitlogData: {
                        goal: hitData.goal,
                        triggers: hitData.triggers,
                        score: hitData.score,
                        detector: hitData.detector,
                        outputIndex: hitData.attempt_idx ?? 0,
                    }
                } as EnrichedAttempt));
            }

            return [
                {
                    ...a,
                    hasHit: false,
                    hitlogData: undefined,
                } as EnrichedAttempt,
            ];
        });

        // Prepare CSV data
        const csvData = enhancedAttempts.map((a) => {
            const output = a.outputs[a.hitlogData?.outputIndex ?? 0] || a.outputs[0] || "";
            return {
                RunID: runId,
                AttemptID: a.uuid,
                Sequence: a.seq,
                Probe: a.probe,
                Goal: a.hitlogData?.goal || "",
                Detector: a.hitlogData?.detector || "",
                Score: a.hitlogData?.score !== undefined ? (a.hitlogData.score * 100).toFixed(2) : "",
                HasHit: a.hasHit ? "Yes" : "No",
                Prompt: a.prompt,
                Output: output,
                Triggers: a.hitlogData?.triggers?.join(", ") || "",
            };
        });

        const csvString = stringify(csvData, {
            header: true,
            columns: [
                "RunID",
                "AttemptID",
                "Sequence",
                "Probe",
                "Goal",
                "Detector",
                "Score",
                "HasHit",
                "Prompt",
                "Output",
                "Triggers"
            ]
        });

        return new NextResponse(csvString, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="garak-run-${runId}.csv"`,
            },
        });

    } catch (error) {
        console.error("Error generating CSV:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
