import { copy } from "@/lib/copy";
import { getMappings } from "@/server/queries/import";
import { EditDrawer } from "./_components/edit-drawer";
import { BackLink } from "@/components/back-link";

export const metadata = { title: copy.mappings.title };

export default async function MappingsPage() {
  const mappings = await getMappings();
  return (
    <main className="min-h-dvh bg-background pb-12">
      <header className="flex items-center gap-2 px-4 pt-4 pb-4">
        <BackLink href="/settings" label={copy.header.back} />
        <h1 className="font-display text-3xl text-clay-900">{copy.mappings.title}</h1>
      </header>
      {mappings.length === 0 ? (
        <p className="px-6 mt-12 text-center font-display italic text-base text-clay-500">
          {copy.mappings.empty}
        </p>
      ) : (
        <ul>
          {mappings.map((m) => (
            <li key={m.walletCategory}>
              <EditDrawer initial={m}>
                <button
                  type="button"
                  className="flex h-12 w-full items-center gap-2 px-6 text-left border-b border-border-muted"
                >
                  <span className="flex-1 truncate font-sans text-sm text-clay-700">{m.walletCategory}</span>
                  <span aria-hidden className="font-sans text-sm text-clay-400">→</span>
                  <span className="flex-1 truncate font-sans text-sm text-clay-900">{m.appCategoryName}</span>
                  <span aria-hidden className="font-sans text-sm text-clay-400">›</span>
                </button>
              </EditDrawer>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
