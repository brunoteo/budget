"use client";

import { useState } from "react";
import { Dropzone } from "./dropzone";
import { parseWalletCsv, ParseError } from "@/lib/import/parse";
import { filterRows } from "@/lib/import/filter";
import { prepareImportAction, type Prepared } from "@/server/actions/import";
import { copy } from "@/lib/copy";

type Phase =
  | { kind: "idle" }
  | { kind: "parsing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; prepared: Prepared };

export function StagingHost() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  async function handleFile(text: string) {
    setPhase({ kind: "parsing" });
    try {
      const parsed = parseWalletCsv(text);
      const { kept } = filterRows(parsed);
      const result = await prepareImportAction(kept);
      if ("error" in result) {
        setPhase({ kind: "error", message: result.error });
        return;
      }
      setPhase({ kind: "ready", prepared: result });
    } catch (e) {
      const message = e instanceof ParseError ? copy.import.parseError : copy.import.parseError;
      setPhase({ kind: "error", message });
    }
  }

  if (phase.kind === "ready") {
    // Placeholder until Task 18 introduces the real <Staging />.
    return (
      <div className="p-6 font-sans text-clay-700">
        Parsed {phase.prepared.rows.length} rows · {phase.prepared.counts.duplicates} duplicates
      </div>
    );
  }

  return (
    <div>
      <Dropzone
        onFile={handleFile}
        onParseError={(m) => setPhase({ kind: "error", message: m })}
        parsing={phase.kind === "parsing"}
      />
      {phase.kind === "error" && (
        <p className="mx-6 mt-4 font-sans text-sm text-sienna-600">{phase.message}</p>
      )}
    </div>
  );
}
