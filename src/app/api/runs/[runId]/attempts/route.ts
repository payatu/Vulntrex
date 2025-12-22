import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { EnrichedAttempt, HitLogEntry, RunData } from "@/lib/garak/run-utils";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ runId: string }> }
) {
    const { runId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const probeFilter = searchParams.get("probe") || "";
    const detectorFilter = searchParams.get("detector") || "";
    const hitsOnly = searchParams.get("hitsOnly") === "true";

    const runDir = path.join(process.cwd(), "data", "runs", runId);
    const normalizedFile = path.join(runDir, "normalized.json");
    const hitlogFile = path.join(runDir, "hitlog.jsonl");

    if (!fs.existsSync(normalizedFile)) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    try {
        // Load normalized data
        const data = JSON.parse(fs.readFileSync(normalizedFile, "utf-8")) as RunData;
        const rawAttempts: EnrichedAttempt[] = (data.attempts || []).map((a) => ({
            ...a,
            hasHit: false, // Default initialization
            hitlogData: undefined
        }));

        // Deduplicate attempts by UUID, keeping the one with the highest status
        const attemptMap = new Map<string, EnrichedAttempt>();
        for (const a of rawAttempts) {
            const existing = attemptMap.get(a.uuid);
            if (!existing || a.status > existing.status) {
                attemptMap.set(a.uuid, a);
            }
        }
        const attempts = Array.from(attemptMap.values());

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
        let enhancedAttempts = attempts.flatMap((a) => {
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
                        outputIndex: hitData.attempt_idx,
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

        // Apply filters
        if (probeFilter) {
            enhancedAttempts = enhancedAttempts.filter((a) =>
                a.probe.includes(probeFilter)
            );
        }

        if (hitsOnly) {
            enhancedAttempts = enhancedAttempts.filter((a) => a.hasHit);
        }

        if (detectorFilter) {
            enhancedAttempts = enhancedAttempts.filter((a) =>
                a.hitlogData?.detector === detectorFilter
            );
        }

        // Pagination
        const total = enhancedAttempts.length;
        const start = (page - 1) * limit;
        const paginatedAttempts = enhancedAttempts.slice(start, start + limit);

        return NextResponse.json({
            attempts: paginatedAttempts,
            total,
            page,
            limit,
        });
    } catch (error) {
        console.error("Error processing run data:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
