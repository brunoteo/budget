"use client";

import { useRef, useState } from "react";
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
        "relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center",
        "bg-surface border-t border-clay-300 px-6 py-10",
        "transition-colors duration-150",
        dragOver ? "bg-clay-200" : "",
      ].join(" ")}
      style={{ borderLeftWidth: dragOver ? 3 : 2, borderLeftStyle: "solid" }}
    >
      <span aria-hidden className="absolute left-0 top-0 bottom-0" style={{ width: dragOver ? 3 : 2, background: "var(--color-terra-500)" }} />
      <h2 className="font-display text-2xl text-clay-800">{copy.import.drop}</h2>
      <p className="mt-2 font-sans text-sm text-clay-500">{copy.import.dropHint}</p>
      {parsing && <p className="mt-4 font-sans text-sm text-clay-600">{copy.import.parsing}</p>}
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
