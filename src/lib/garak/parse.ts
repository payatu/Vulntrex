import fs from "fs";
import readline from "readline";
import path from "path";
import {
  GarakReportEntry,
  GarakHitlogEntry,
  NormalizedRunData,
  NormalizedRunMeta,
  NormalizedAttempt,
  NormalizedEval,
  NormalizedProbeSummary,
  GarakInitEntry,
  GarakAttemptEntry,
  GarakDigestEntry,
  GarakEvalEntry,
} from "@/lib/garak/types";

export async function parseJsonlFile<T = unknown>(filePath: string): Promise<T[]> {
  const entries: T[] = [];
  const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch {
      // skip malformed line
    }
  }
  return entries;
}

export async function parseGarakReport(reportPath: string): Promise<NormalizedRunData> {
  const rawEntries = await parseJsonlFile<GarakReportEntry>(reportPath);

  const meta: NormalizedRunMeta = { runId: "" };
  const attempts: NormalizedAttempt[] = [];
  const evals: NormalizedEval[] = [];
  const probes: NormalizedProbeSummary[] = [];

  for (const entry of rawEntries) {
    if ((entry as GarakInitEntry).entry_type === "init") {
      const init = entry as GarakInitEntry;
      meta.runId = init.run;
      meta.garakVersion = init.garak_version;
      meta.startTime = init.start_time;
    } else if ((entry as GarakAttemptEntry).entry_type === "attempt") {
      const at = entry as GarakAttemptEntry;
      // Show ALL attempts from report (both status 1 and status 2)
      const firstUser = at.prompt?.turns?.find((t) => t.role === "user");
      attempts.push({
        uuid: at.uuid,
        seq: at.seq,
        status: at.status,
        probe: at.probe_classname,
        goal: at.goal,
        prompt: firstUser?.content?.text ?? "",
        outputs: (at.outputs ?? []).map((o) => o?.text ?? ""),
        detectorResults: at.detector_results ?? {},
      });
    } else if ((entry as GarakEvalEntry).entry_type === "eval") {
      const ev = entry as GarakEvalEntry;
      evals.push({ probe: ev.probe, detector: ev.detector, passed: ev.passed, total: ev.total });
    } else if ((entry as GarakDigestEntry).entry_type === "digest") {
      const dg = entry as GarakDigestEntry;
      meta.modelType = (dg.meta?.model_type || dg.meta?.target_type) as string | undefined;
      meta.modelName = (dg.meta?.model_name || dg.meta?.target_name) as string | undefined;
      meta.probeSpec = dg.meta?.probespec as string | undefined;
      const evalBlock = (dg.eval ?? {}) as Record<string, unknown>;
      for (const [groupKey, groupVal] of Object.entries(evalBlock)) {
        if (groupKey === "_summary") continue;
        const probeBlock = groupVal as Record<string, unknown>;

        // Handle both single probe and multiple probes per group
        const probeKeys = Object.keys(probeBlock).filter(k => k !== "_summary");

        for (const probeKey of probeKeys) {
          const probeData = probeBlock[probeKey] as Record<string, unknown>;
          const summary = (probeData._summary ?? {}) as Record<string, unknown>;
          const detectors: NormalizedProbeSummary["detectors"] = [];

          for (const [detKey, detVal] of Object.entries(probeData)) {
            if (detKey === "_summary") continue;
            const dv = detVal as Record<string, unknown>;
            detectors.push({
              detectorName: detKey,
              absoluteScore: dv.absolute_score as number | undefined,
              absoluteDefcon: dv.absolute_defcon as number | undefined,
              relativeScore: dv.relative_score as number | undefined,
              relativeDefcon: dv.relative_defcon as number | undefined,
              detectorDefcon: dv.detector_defcon as number | undefined,
            });
          }

          probes.push({
            probeName: (summary.probe_name as string | undefined) ?? probeKey,
            probeScore: summary.probe_score as number | undefined,
            probeSeverity: summary.probe_severity as number | undefined,
            probeDescr: summary.probe_descr as string | undefined,
            probeTier: summary.probe_tier as number | undefined,
            probeTags: (summary.probe_tags as string[] | undefined) ?? undefined,
            detectors,
          });
        }
      }
    }
  }

  return { meta, attempts, evals, probes };
}

export async function parseGarakHitlog(hitlogPath: string): Promise<GarakHitlogEntry[]> {
  return parseJsonlFile<GarakHitlogEntry>(hitlogPath);
}

export function resolveWorkspacePath(...parts: string[]): string {
  return path.join(process.cwd(), ...parts);
}


