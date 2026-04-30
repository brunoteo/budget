"use client";

import { useState } from "react";
import { Dropzone } from "./dropzone";
import { parseWalletCsv, ParseError } from "@/lib/import/parse";
import { filterRows } from "@/lib/import/filter";
import { prepareImportAction, type Prepared } from "@/server/actions/import";
import { copy } from "@/lib/copy";
import { Staging } from "./staging";
import { Success } from "./success";

export type CategoryRecap = { appCategoryName: string; count: number; total: number };

type Phase =
  | { kind: "idle" }
  | { kind: "parsing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; prepared: Prepared; excluded: number }
  | {
      kind: "done";
      importId: string;
      count: number;
      range: { start: string; end: string };
      total: number;
      recap: CategoryRecap[];
    };

export function StagingHost() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  async function handleFile(text: string) {
    setPhase({ kind: "parsing" });
    try {
      const parsed = parseWalletCsv(text);
      const { kept, counts } = filterRows(parsed);
      const excluded = counts.entrate + counts.transfer + counts.zero;
      const result = await prepareImportAction(kept);
      if ("error" in result) {
        setPhase({ kind: "error", message: result.error });
        return;
      }
      setPhase({ kind: "ready", prepared: result, excluded });
    } catch (e) {
      const message = e instanceof ParseError ? copy.import.parseError : copy.import.parseError;
      setPhase({ kind: "error", message });
    }
  }

  if (phase.kind === "ready") {
    return (
      <Staging
        prepared={phase.prepared}
        excludedCount={phase.excluded}
        onCommitted={(importId, count, range, total, recap) =>
          setPhase({ kind: "done", importId, count, range, total, recap })
        }
      />
    );
  }
  if (phase.kind === "done") {
    return (
      <Success
        importId={phase.importId}
        count={phase.count}
        range={phase.range}
        total={phase.total}
        recap={phase.recap}
      />
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
        <p className="mt-3 text-sm text-destructive" aria-live="polite">{phase.message}</p>
      )}
    </div>
  );
}
