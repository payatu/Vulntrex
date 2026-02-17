import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

// SECURITY: Use server-side configuration only via environment variables
// This prevents command injection attacks from user-controlled input if deployed over network
const GARAK_COMMAND = process.env.GARAK_COMMAND || "python";
const GARAK_MODULE = process.env.GARAK_MODULE || "garak";

interface ListItem {
    name: string;
    isActive: boolean;
    isDisabledByDefault: boolean;
}

interface ListGroup {
    name: string;
    isPlugin: boolean;
    probes: ListItem[];
}

const ANSI_PATTERN = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const STAR_MARKERS = ["\u{1F31F}", "\u00F0\u0178\u0152\u0178"];
const SLEEP_MARKERS = ["\u{1F4A4}", "\u00F0\u0178\u2019\u00A4"];

const stripAnsi = (value: string) => value.replace(ANSI_PATTERN, "");
const hasMarker = (value: string, markers: string[]) => markers.some((marker) => value.includes(marker));

function parseListOutput(rawOutput: string, type: "probes" | "detectors"): ListGroup[] {
    const linePattern = new RegExp(`^${type}:\\s+([A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)?)(?:\\s+(.*))?$`);
    const groupedItems = new Map<string, ListItem[]>();
    const groupMeta = new Map<string, { isPlugin: boolean }>();

    for (const rawLine of rawOutput.split(/\r?\n/)) {
        const line = stripAnsi(rawLine).trim();
        if (!line.startsWith(`${type}:`)) {
            continue;
        }

        const match = line.match(linePattern);
        if (!match) {
            continue;
        }

        const identifier = match[1];
        const suffix = (match[2] ?? "").trim();
        const hasStar = hasMarker(suffix, STAR_MARKERS);
        const hasSleep = hasMarker(suffix, SLEEP_MARKERS) || hasMarker(line, SLEEP_MARKERS);

        if (!identifier.includes(".")) {
            const currentMeta = groupMeta.get(identifier) ?? { isPlugin: false };
            currentMeta.isPlugin = currentMeta.isPlugin || hasStar;
            groupMeta.set(identifier, currentMeta);

            if (!groupedItems.has(identifier)) {
                groupedItems.set(identifier, []);
            }

            continue;
        }

        const groupName = identifier.split(".")[0];
        if (!groupName) {
            continue;
        }

        const currentMeta = groupMeta.get(groupName) ?? { isPlugin: false };
        currentMeta.isPlugin = currentMeta.isPlugin || hasStar;
        groupMeta.set(groupName, currentMeta);

        const existing = groupedItems.get(groupName) ?? [];
        if (!existing.some((item) => item.name === identifier)) {
            existing.push({
                name: identifier,
                isActive: !hasSleep,
                isDisabledByDefault: hasSleep,
            });
        }
        groupedItems.set(groupName, existing);
    }

    return [...groupedItems.entries()]
        .map(([name, probes]) => ({
            name,
            isPlugin: groupMeta.get(name)?.isPlugin ?? false,
            probes: probes.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

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
        const items = await new Promise<ListGroup[]>((resolve) => {
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
                const parsedItems = parseListOutput(output, type);

                if (code !== 0) {
                    console.warn(`Garak list command failed with code ${code}: ${error}`);
                }

                resolve(parsedItems);
            });

            // Handle spawn errors
            child.on("error", (err) => {
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
