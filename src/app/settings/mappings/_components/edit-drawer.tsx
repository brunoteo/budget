"use client";

import { useState, type ReactNode } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer";
import { copy } from "@/lib/copy";
import { updateMappingAction, deleteMappingAction } from "@/server/actions/import";

type Props = {
  children: ReactNode;
  initial: { walletCategory: string; appCategoryName: string };
};

export function EditDrawer({ children, initial }: Props) {
  const [name, setName] = useState(initial.appCategoryName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true); setError(null);
    const r = await updateMappingAction({ walletCategory: initial.walletCategory, appCategoryName: name });
    setPending(false);
    if ("error" in r) setError(r.error);
  }

  async function handleDelete() {
    setPending(true); setError(null);
    const r = await deleteMappingAction({ walletCategory: initial.walletCategory });
    setPending(false);
    if ("error" in r) setError(r.error);
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-display text-base text-clay-700">{copy.mappings.title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-6 pb-8 space-y-4">
          <div>
            <p className="font-sans text-xs uppercase tracking-wider text-clay-600">{copy.mappings.walletLabel}</p>
            <p className="font-sans text-base text-clay-900">{initial.walletCategory}</p>
          </div>
          <div>
            <label className="font-sans text-xs uppercase tracking-wider text-clay-600">{copy.mappings.appLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-border bg-surface px-3 font-sans text-base text-clay-900"
              maxLength={80}
            />
          </div>
          {error && <p className="font-sans text-sm text-sienna-600">{error}</p>}
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              disabled={pending || name.trim().length === 0}
              onClick={handleSave}
              className="h-12 rounded-md bg-terra-500 px-6 font-sans text-base text-white disabled:opacity-60"
            >
              {copy.mappings.save}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleDelete}
              className="h-12 rounded-md border border-sienna-500 px-6 font-sans text-base text-sienna-500 disabled:opacity-60"
            >
              {copy.mappings.delete}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
