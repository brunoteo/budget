import Link from "next/link";
import { copy } from "@/lib/copy";
import { getDashboardForToday } from "@/server/queries/dashboard";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { ProfileForm } from "./_components/profile-form";
import { CycleSalaryForm } from "./_components/cycle-salary-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getDashboardForToday(new Date().toISOString().slice(0, 10));
  if (!data) redirect("/login");
  const c = copy.settings;

  return (
    <main className="mx-auto w-full max-w-md space-y-6 p-4 sm:max-w-lg sm:p-6">
      <div className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-2xl text-text-primary">{c.title}</h1>
      </div>

      <ProfileForm defaults={data.profile} />
      <CycleSalaryForm cycleId={data.cycle.id} defaultSalary={data.cycle.salary} />

      <Link
        href="/settings/mappings"
        className="flex h-12 w-full items-center justify-between rounded-lg border border-border bg-surface px-4 text-text-primary shadow-sm transition-colors hover:bg-clay-200"
      >
        <span>{copy.mappings.settingsLink}</span>
        <span aria-hidden className="text-text-muted">›</span>
      </Link>
    </main>
  );
}
