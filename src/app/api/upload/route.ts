import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { parseGarakReport } from "@/lib/garak/parse";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const report = form.get("report") as File | null;
  const hitlog = form.get("hitlog") as File | null;
  if (!report) {
    return new Response(JSON.stringify({ error: "report is required" }), { status: 400 });
  }
  const buf = Buffer.from(await report.arrayBuffer());
  const tmpDir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(tmpDir, { recursive: true });
  const reportPath = path.join(tmpDir, report.name);
  fs.writeFileSync(reportPath, buf);
  if (hitlog) {
    const hbuf = Buffer.from(await hitlog.arrayBuffer());
    fs.writeFileSync(path.join(tmpDir, hitlog.name), hbuf);
  }
  const parsed = await parseGarakReport(reportPath);
  const runId = parsed.meta.runId || path.parse(report.name).name;
  const runDir = path.join(process.cwd(), "data", "runs", runId);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, "normalized.json"), JSON.stringify(parsed, null, 2), "utf-8");
  // Copy original JSONL files to run directory (keep original format)
  fs.writeFileSync(path.join(runDir, "report.jsonl"), buf, "utf-8");
  if (hitlog) {
    const hbuf = Buffer.from(await hitlog.arrayBuffer());
    fs.writeFileSync(path.join(runDir, "hitlog.jsonl"), hbuf, "utf-8");
  }
  return new Response(JSON.stringify({ ok: true, runId }), { status: 200 });
}


