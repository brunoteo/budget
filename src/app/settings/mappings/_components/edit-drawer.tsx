"use client";

import { useState, type ReactNode } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer";
import { copy } from "@/lib/copy";
import { updateMappingAction, deleteMappingAction } from "@/server/actions/import";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
          <DrawerTitle className="font-display text-lg text-text-primary">
            {copy.mappings.title}
          </DrawerTitle>
        </DrawerHeader>
        <div className="space-y-5 px-6 pb-8">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-text-muted">{copy.mappings.walletLabel}</p>
            <p className="text-base text-text-primary">{initial.walletCategory}</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="mapping-app-name" className="block text-xs uppercase tracking-wider text-text-muted">
              {copy.mappings.appLabel}
            </label>
            <Input
              id="mapping-app-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>
          {error && <p className="text-sm text-destructive" aria-live="polite">{error}</p>}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="button"
              size="lg"
              disabled={pending || name.trim().length === 0}
              onClick={handleSave}
            >
              {copy.mappings.save}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={pending}
              onClick={handleDelete}
            >
              {copy.mappings.delete}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
