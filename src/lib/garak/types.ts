export type GarakEntryType =
  | "start_run setup"
  | "init"
  | "attempt"
  | "eval"
  | "completion"
  | "digest";

export interface GarakStartRunSetupEntry {
  entry_type: "start_run setup";
  _config?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GarakInitEntry {
  entry_type: "init";
  garak_version: string;
  start_time: string;
  run: string;
}

export interface GarakPromptTurnContent {
  text: string;
  lang: string;
  data_path: string | null;
  data_type: string | null;
  data_checksum: string | null;
  notes: Record<string, unknown>;
}

export interface GarakTurn {
  role: "user" | "assistant";
  content: GarakPromptTurnContent;
}

export interface GarakPrompt {
  turns: GarakTurn[];
  notes: unknown;
}

export interface GarakAttemptEntry {
  entry_type: "attempt";
  uuid: string;
  seq: number;
  status: number; // see garak.attempts for constants
  probe_classname: string; // e.g., "lmrc.Profanity"
  probe_params: Record<string, unknown>;
  targets: unknown[];
  prompt: GarakPrompt;
  outputs: ({ text: string; lang: string } | null)[];
  detector_results: Record<string, number[]>;
  notes: Record<string, unknown>;
  goal: string;
  conversations: { turns: GarakTurn[]; notes: unknown }[];
  reverse_translation_outputs: unknown[];
}

export interface GarakEvalEntry {
  entry_type: "eval";
  probe: string;
  detector: string;
  passed: number;
  total: number;
}

export interface GarakCompletionEntry {
  entry_type: "completion";
  end_time: string;
  run: string;
}

export interface GarakDigestEntry {
  entry_type: "digest";
  meta: {
    reportfile: string;
    garak_version: string;
    start_time: string;
    run_uuid: string;
    setup: Record<string, unknown>;
    probespec: string;
    model_type: string;
    model_name: string;
    target_type?: string;
    target_name?: string;
    payloads: unknown[];
    group_aggregation_function: string;
    report_digest_time: string;
    calibration_used: boolean;
  };
  eval: Record<string, unknown>;
}

export type GarakReportEntry =
  | GarakStartRunSetupEntry
  | GarakInitEntry
  | GarakAttemptEntry
  | GarakEvalEntry
  | GarakCompletionEntry
  | GarakDigestEntry;

export interface GarakHitlogEntry {
  goal: string;
  prompt: GarakPrompt;
  output: { text: string; lang: string };
  triggers: unknown;
  score: number;
  run_id: string;
  attempt_id: string;
  attempt_seq: number;
  attempt_idx: number;
  generator: string; // e.g., "huggingface gpt2"
  probe: string; // e.g., "lmrc.Profanity"
  detector: string; // e.g., "unsafe_content.SurgeProfanitySexual"
  generations_per_prompt: number;
}

export interface NormalizedRunMeta {
  runId: string;
  garakVersion?: string;
  startTime?: string;
  modelType?: string;
  modelName?: string;
  probeSpec?: string;
}

export interface NormalizedAttempt {
  uuid: string;
  seq: number;
  status: number;
  probe: string;
  goal: string;
  prompt: string; // first user turn text
  outputs: string[]; // raw texts
  detectorResults: Record<string, number[]>; // detector -> scores per gen
}

export interface NormalizedEval {
  probe: string;
  detector: string;
  passed: number;
  total: number;
}

export interface NormalizedDigestDetector {
  detectorName: string;
  absoluteScore?: number;
  absoluteDefcon?: number;
  relativeScore?: number;
  relativeDefcon?: number;
  detectorDefcon?: number;
}

export interface NormalizedProbeSummary {
  probeName: string;
  probeScore?: number;
  probeSeverity?: number;
  probeDescr?: string;
  probeTier?: number;
  probeTags?: string[];
  detectors?: NormalizedDigestDetector[];
}

export interface NormalizedRunData {
  meta: NormalizedRunMeta;
  attempts: NormalizedAttempt[];
  evals: NormalizedEval[];
  probes: NormalizedProbeSummary[];
}



export interface RunInfo {
  runId: string;
  pid: number;
  status: "running" | "completed" | "failed" | "cancelled";
  startTime: number;
  endTime?: number;
  model: string;
  probes?: string;
  detectors?: string;
  reportPrefix: string;
  logFile: string;
  resultPath?: string;
  error?: string;
}
