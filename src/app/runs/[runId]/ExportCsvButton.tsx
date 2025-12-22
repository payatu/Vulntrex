"use client";
import { useCallback } from "react";

interface Row { uuid: string; probe: string; seq: number; prompt: string; outputSample: string; hasHit?: boolean }

export default function ExportCsvButton({ rows, fileName = "attempts.csv" }: { rows: Row[]; fileName?: string }) {
  const onClick = useCallback(() => {
    const header = ["uuid", "probe", "seq", "hasHit", "prompt", "outputSample"];
    const escape = (s: string) => '"' + s.replaceAll('"', '""').replaceAll("\n", " ") + '"';
    const csv = [header.join(",")]
      .concat(
        rows.map((r) => [r.uuid, r.probe, String(r.seq), r.hasHit ? "1" : "0", escape(r.prompt), escape(r.outputSample)].join(","))
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, fileName]);

  return (
    <button onClick={onClick} className="rounded border px-3 py-1 text-sm">Export CSV</button>
  );
}


