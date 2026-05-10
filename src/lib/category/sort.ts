const collator = new Intl.Collator("it", { sensitivity: "base" });

export function sortCategoriesByName<T extends { name: string }>(arr: readonly T[]): T[] {
  return [...arr].sort((a, b) => collator.compare(a.name, b.name));
}
