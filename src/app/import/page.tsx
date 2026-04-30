import { copy } from "@/lib/copy";
import { StagingHost } from "./_components/staging-host";
import { BackLink } from "@/components/back-link";

export const metadata = { title: copy.import.title };

export default function ImportPage() {
  return (
    <main className="min-h-dvh bg-background pb-24">
      <header className="flex items-center gap-2 px-4 pt-4 pb-4">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-3xl text-clay-900">{copy.import.title}</h1>
      </header>
      <StagingHost />
    </main>
  );
}
