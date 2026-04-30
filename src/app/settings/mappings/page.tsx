import { copy } from "@/lib/copy";
import { getMappings } from "@/server/queries/import";
import { EditDrawer } from "./_components/edit-drawer";
import { BackLink } from "@/components/back-link";

export const metadata = { title: copy.mappings.title };

export default async function MappingsPage() {
  const mappings = await getMappings();
  return (
    <main className="mx-auto w-full max-w-md space-y-6 p-4 pb-12 sm:max-w-lg sm:p-6">
      <header className="flex items-center gap-2">
        <BackLink href="/settings" label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{copy.mappings.title}</h1>
      </header>
      {mappings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">{copy.mappings.empty}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border-muted overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          {mappings.map((m) => (
            <li key={m.walletCategory}>
              <EditDrawer initial={m}>
                <button
                  type="button"
                  className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-clay-50"
                >
                  <span className="flex-1 truncate text-sm text-text-muted">{m.walletCategory}</span>
                  <span aria-hidden className="text-sm text-text-muted">→</span>
                  <span className="flex-1 truncate text-sm font-medium text-text-primary">{m.appCategoryName}</span>
                  <span aria-hidden className="text-sm text-text-muted">›</span>
                </button>
              </EditDrawer>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
