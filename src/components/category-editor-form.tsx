import { copy } from "@/lib/copy";
import { createCategoryAction } from "@/server/actions/category";

export function CategoryEditorForm({ cycleId }: { cycleId: string }) {
  const c = copy.categories;
  return (
    <form
      action={async (fd) => { "use server"; await createCategoryAction(fd); }}
      className="space-y-2 rounded-xl border border-clay-200 bg-clay-50 p-3 shadow-sm"
    >
      <h2 className="font-display text-sm font-semibold text-clay-900">{c.addTitle}</h2>
      <input type="hidden" name="cycleId" value={cycleId} />
      <input name="name" required placeholder={c.namePlaceholder}
        className="w-full rounded-lg border border-clay-300 bg-clay-50 p-3" />
      <input name="expectedAmount" type="number" step="0.01" min="0" required inputMode="decimal" placeholder={c.budgetPlaceholder}
        className="w-full rounded-lg border border-clay-300 bg-clay-50 p-3 font-mono tabular-nums" />
      <label className="flex items-center gap-2 text-sm text-clay-700">
        <input type="checkbox" name="isFixed" /> {c.fixedLabel}
      </label>
      <button type="submit" className="w-full rounded-lg bg-terra-500 p-3 text-clay-50">{c.add}</button>
    </form>
  );
}
