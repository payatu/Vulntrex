import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

// SECURITY: Use server-side configuration only via environment variables
// This prevents command injection attacks from user-controlled input if deployed over network
const GARAK_COMMAND = process.env.GARAK_COMMAND || "python";
const GARAK_MODULE = process.env.GARAK_MODULE || "garak";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type"); // 'probes' or 'detectors'

    if (type !== "probes" && type !== "detectors") {
        return NextResponse.json({ error: "Invalid type. Must be 'probes' or 'detectors'" }, { status: 400 });
    }

    const flag = type === "probes" ? "--list_probes" : "--list_detectors";
    const command = GARAK_COMMAND;
    const args = ["-m", GARAK_MODULE, flag];

    try {
        const items = await new Promise<any[]>((resolve, reject) => {
            const child = spawn(command, args, {
                shell: true,
            });

            let output = "";
            let error = "";

            child.stdout.on("data", (data) => {
                output += data.toString();
            });

            child.stderr.on("data", (data) => {
                error += data.toString();
            });

            child.on("close", (code) => {
                // Parse Logic

                // Helper to strip ANSI codes
                const stripAnsi = (str: string) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");

                const lines = output.split("\n").map(l => stripAnsi(l));

                interface ProbeItem {
                    name: string;
                    isActive: boolean;
                }

                const groups: Record<string, ProbeItem[]> = {};
                let currentCategory = "Uncategorized";

                lines.forEach(l => {
                    // Check for Plugin/Category line (ends with 🌟)
                    if (l.includes("🌟")) {
                        const match = l.match(/probes:\s+([a-zA-Z0-9_]+)\s+🌟/);
                        if (match) {
                            currentCategory = match[1];
                            if (!groups[currentCategory]) groups[currentCategory] = [];
                        }
                        return;
                    }

                    // Check for Probe/Detector line (contains . and possibly 💤)
                    if (l.includes(".")) {
                        const isActive = !l.includes("💤");
                        // Robust match for module.Class
                        const match = l.match(/\b(?<!garak\.)([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\b/);

                        if (match) {
                            const name = match[1];
                            if (name.length > 3 && !name.startsWith("garak.")) {
                                // Determine category
                                let category = currentCategory;

                                // Heuristic: If still "Uncategorized", try prefix
                                if (category === "Uncategorized") {
                                    const parts = name.split(".");
                                    if (parts.length > 0) category = parts[0];
                                }

                                if (!groups[category]) groups[category] = [];

                                if (!groups[category].some(p => p.name === name)) {
                                    groups[category].push({ name, isActive });
                                }
                            }
                        }
                    }
                });

                const parsedItems = Object.entries(groups).map(([name, probes]) => ({
                    name,
                    probes: probes.sort((a, b) => a.name.localeCompare(b.name))
                })).sort((a, b) => a.name.localeCompare(b.name));

                if (code !== 0) {
                    console.warn(`Garak list command failed with code ${code}: ${error}`);
                }
                resolve(parsedItems);
            });

            // Handle spawn errors
            child.on('error', (err) => {
                console.error("Spawn error:", err);
                // Return empty list on spawn error
                resolve([]);
            });
        });

        return NextResponse.json({ items });
    } catch (e) {
        console.error("API error:", e);
        // Error case: Return empty list. NO FALLBACKS.
        return NextResponse.json({ items: [] });
    }
}
