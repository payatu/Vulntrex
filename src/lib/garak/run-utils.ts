import fs from "fs";
import path from "path";

export interface RunData {
  meta?: { modelType?: string; modelName?: string; startTime?: string };
  probes?: Array<{ probeName: string; probeScore?: number; probeDescr?: string; detectors?: Array<{ detectorName: string; absoluteScore?: number }> }>;
  attempts?: Array<{ uuid: string; probe: string; seq: number; status: number; prompt: string; outputs: (string | null)[] }>;
}

export interface HitLogEntry {
  attempt_id: string;
  detector: string;
  goal: string;
  triggers: string[];
  score: number;
  prompt?: unknown;
  output?: unknown;
  attempt_idx?: number;
}

export function getRunFile(runId: string) {
  return path.join(process.cwd(), "data", "runs", runId, "normalized.json");
}

export function getHitLogFile(runId: string) {
  return path.join(process.cwd(), "data", "runs", runId, "hitlog.jsonl");
}

export function loadRunData(runId: string): RunData | null {
  const file = getRunFile(runId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as RunData;
  } catch (e) {
    console.error(`Failed to parse run data for ${runId}:`, e);
    return null;
  }
}

export function loadHitLog(runId: string): HitLogEntry[] {
  const hitlogFile = getHitLogFile(runId);
  if (!fs.existsSync(hitlogFile)) return [];
  try {
    const content = fs.readFileSync(hitlogFile, "utf-8");
    return content.split("\n")
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(item => item !== null) as HitLogEntry[];
  } catch (e) {
    console.error("Failed to parse hitlog:", e);
    return [];
  }
}

export interface EnrichedAttempt {
  uuid: string;
  probe: string;
  seq: number;
  status: number;
  prompt: string;
  outputs: (string | null)[];
  hasHit: boolean;
  hitlogData?: {
    goal: string;
    triggers: string[];
    score: number;
    detector: string;
    outputIndex?: number;
  };
}

export function getAttemptsWithHits(data: RunData, hits: HitLogEntry[]): EnrichedAttempt[] {
  return (data.attempts ?? []).flatMap((a) => {
    const attemptHits = hits.filter((h) => h.attempt_id === a.uuid);

    // Only show hit tags for completed attempts (status 2)
    if (a.status === 2 && attemptHits.length > 0) {
      // Create a separate entry for each hit
      return attemptHits.map((hitData) => ({
        ...a,
        hasHit: true,
        hitlogData: {
          goal: hitData.goal,
          triggers: hitData.triggers,
          score: hitData.score,
          detector: hitData.detector
        }
      } as EnrichedAttempt));
    }

    // Default case: return single attempt (no hit or status 1)
    return [{
      ...a,
      hasHit: false,
      hitlogData: undefined
    } as EnrichedAttempt];
  });
}
