"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { copy } from "@/lib/copy";

type Props = {
  onFile: (text: string) => Promise<void> | void;
  onParseError: (message: string) => void;
  parsing: boolean;
};

export function Dropzone({ onFile, onParseError, parsing }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      onParseError(copy.import.parseError);
      return;
    }
    const text = await file.text();
    await onFile(text);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
      className={[
        "relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-2 text-center",
        "rounded-lg border border-dashed bg-surface px-6 py-10 shadow-sm",
        "transition-colors duration-150",
        dragOver
          ? "border-accent bg-clay-200"
          : "border-border hover:border-accent/60 hover:bg-clay-50",
      ].join(" ")}
    >
      <Upload
        className={`h-7 w-7 ${dragOver ? "text-accent" : "text-text-muted"}`}
        strokeWidth={1.5}
        aria-hidden
      />
      <h2 className="font-display text-xl text-text-primary">{copy.import.drop}</h2>
      <p className="text-sm text-text-muted">{copy.import.dropHint}</p>
      {parsing && <p className="mt-2 text-sm text-text-muted">{copy.import.parsing}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
