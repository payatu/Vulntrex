import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type"); // 'probes' or 'detectors'
    const garakCommand = searchParams.get("command") || "python3 -m garak";

    if (type !== "probes" && type !== "detectors") {
        return NextResponse.json({ error: "Invalid type. Must be 'probes' or 'detectors'" }, { status: 400 });
    }

    const flag = type === "probes" ? "--list_probes" : "--list_detectors";

    // Parse command
    const cmdParts = garakCommand.split(" ").filter(Boolean);
    const command = cmdParts[0];
    const args = [...cmdParts.slice(1), flag];

    try {
        const items = await new Promise<string[]>((resolve, reject) => {
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
                if (code !== 0) {
                    console.error(`Garak list failed: ${error}`);
                    reject(new Error(error || "Command failed"));
                } else {
                    // Parse output
                    // Garak list output format varies, but usually lines of "module.Class description"
                    // We'll split by lines and filter

                    // Helper to strip ANSI codes
                    const stripAnsi = (str: string) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");

                    // Remove emojis and other special characters
                    const stripEmoji = (str: string) => str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|💤|🌟/gu, "").trim();

                    const prefix = type === "probes" ? "probes:" : "detectors:";

                    const parsedItems = output.split("\n")
                        .map(l => stripAnsi(l).trim())
                        .filter(l => l.startsWith(prefix)) // Only lines starting with probes: or detectors:
                        .map(l => stripEmoji(l.substring(prefix.length).trim())) // Remove prefix and emojis
                        .filter(l => l.includes(".")) // Valid modules have a dot (e.g., ansiescape.AnsiEscaped)
                        .map(l => l.split(/\s+/)[0]) // Get just the module.Class part
                        .filter(l => l && l.length > 0);

                    resolve(parsedItems);
                }
            });
        });

        return NextResponse.json({ items });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
