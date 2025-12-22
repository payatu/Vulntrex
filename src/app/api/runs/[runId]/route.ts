import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const file = path.join(process.cwd(), "data", "runs", runId, "normalized.json");
  
  if (!fs.existsSync(file)) {
    return new Response(JSON.stringify({ error: "Run not found" }), { status: 404 });
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    return new Response(JSON.stringify(data), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to read run data" }), { status: 500 });
  }
}
