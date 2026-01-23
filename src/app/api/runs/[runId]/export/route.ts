import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { EnrichedAttempt, HitLogEntry, RunData } from "@/lib/garak/run-utils";
import { stringify } from "csv-stringify/sync";

/** Normalize a single output item from Garak (string, {text}, {content}, or other) to string. */
function normalizeOutputItem(o: unknown): string {
    if (o == null) return "";
    if (typeof o === "string") return o;
    if (typeof o === "object") {
        const obj = o as { text?: string; content?: string };
        const s = obj.text ?? obj.content ?? "";
        return typeof s === "string" ? s : String(s);
    }
    return String(o);
}

/** Extract outputs array from a raw attempt-like object (Garak report format). */
function extractOutputsFromRaw(obj: { outputs?: unknown; generations?: unknown } | null): string[] {
    const raw = obj?.outputs ?? obj?.generations;
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeOutputItem);
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ runId: string }> }
) {
    const { runId } = await params;

    const runDir = path.join(process.cwd(), "data", "runs", runId);
    const normalizedFile = path.join(runDir, "normalized.json");
    const hitlogFile = path.join(runDir, "hitlog.jsonl");
    const reportFile = path.join(runDir, "report.jsonl");

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

        // Fallback: if normalized outputs are empty, re-extract from report.jsonl (handles different Garak encodings/formats)
        const outputsFromReport = new Map<string, string[]>();
        if (fs.existsSync(reportFile)) {
            const reportContent = fs.readFileSync(reportFile, "utf-8");
            const lines = reportContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
            for (const line of lines) {
                try {
                    const ent = JSON.parse(line) as { entry_type?: string; uuid?: string; outputs?: unknown; generations?: unknown };
                    if (ent?.entry_type === "attempt" && ent.uuid) {
                        const out = extractOutputsFromRaw(ent);
                        if (out.length > 0) outputsFromReport.set(ent.uuid, out);
                    }
                } catch { /* skip malformed */ }
            }
        }

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

        // Resolve outputs per attempt: normalize from normalized.json; if all empty, fallback to report.jsonl
        const getOutputs = (a: { uuid: string; outputs?: unknown; generations?: unknown }): string[] => {
            const fromNorm = extractOutputsFromRaw(a as { outputs?: unknown; generations?: unknown });
            if (fromNorm.some((s) => s.length > 0)) return fromNorm;
            return outputsFromReport.get(a.uuid) ?? fromNorm;
        };

        // Max outputs across all attempts to build dynamic Output 1, Output 2, ... columns
        const maxOutputs = Math.max(1, ...enhancedAttempts.map((a) => getOutputs(a).length));
        const outputColumns = Array.from({ length: maxOutputs }, (_, i) => `Output ${i + 1}`);

        const baseColumns = ["RunID", "AttemptID", "Sequence", "Probe", "Goal", "Detector", "Score", "HasHit", "Prompt"];
        const columns = [...baseColumns, ...outputColumns, "Triggers"];

        const triggersStr = (t: unknown): string =>
            Array.isArray(t) ? (t as string[]).map(String).join(", ") : String(t ?? "");

        const csvData = enhancedAttempts.map((a) => {
            const outputs = getOutputs(a);
            const row: Record<string, string> = {
                RunID: runId,
                AttemptID: a.uuid,
                Sequence: String(a.seq),
                Probe: String(a.probe ?? ""),
                Goal: String(a.hitlogData?.goal ?? ""),
                Detector: String(a.hitlogData?.detector ?? ""),
                Score: a.hitlogData?.score !== undefined ? (a.hitlogData.score * 100).toFixed(2) : "",
                HasHit: a.hasHit ? "Yes" : "No",
                Prompt: String(a.prompt ?? ""),
                Triggers: triggersStr(a.hitlogData?.triggers),
            };
            for (let i = 0; i < maxOutputs; i++) {
                row[`Output ${i + 1}`] = String(outputs[i] ?? "");
            }
            return row;
        });

        const csvString = stringify(csvData, {
            header: true,
            columns,
            bom: true,
            quoted: true,
            quoted_empty: true,
        });

        return new NextResponse(csvString, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
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
