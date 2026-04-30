"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { copy } from "@/lib/copy";

const TOASTS: Record<string, () => void> = {
  expenseAdded:    () => toast.success(copy.toast.expenseAdded),
  expenseDeleted:  () => toast.success(copy.toast.expenseDeleted),
  categorySaved:   () => toast.success(copy.toast.categorySaved),
  categoryDeleted: () => toast.success(copy.toast.categoryDeleted),
  settingsSaved:   () => toast.success(copy.toast.settingsSaved),
};

export function ToastFromQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const key = params.get("toast");

  useEffect(() => {
    if (!key) return;
    const fire = TOASTS[key];
    if (fire) fire();
    const next = new URLSearchParams(params);
    next.delete("toast");
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [key, params, pathname, router]);

  return null;
}
