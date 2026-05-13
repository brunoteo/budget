import { copy } from "@/lib/copy";
import { StagingHost } from "./_components/staging-host";
import { LastImportBanner } from "./_components/last-import-banner";
import { BackLink } from "@/components/back-link";

export const metadata = { title: copy.import.title };

export default function ImportPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md space-y-6 p-4 pb-24 sm:max-w-lg sm:p-6">
      <header className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{copy.import.title}</h1>
      </header>
      <LastImportBanner />
      <StagingHost />
    </main>
  );
}
