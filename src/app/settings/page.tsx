import Link from "next/link";
import { copy } from "@/lib/copy";
import { updateProfileAction } from "@/server/actions/profile";
import { setCycleSalaryAction } from "@/server/actions/cycle";
import { getDashboardForToday } from "@/server/queries/dashboard";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/back-link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getDashboardForToday(new Date().toISOString().slice(0, 10));
  if (!data) redirect("/login");
  const c = copy.settings;

  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <div className="flex items-center gap-2">
        <BackLink label={copy.header.back} />
        <h1 className="font-display text-xl font-semibold text-clay-900">{c.title}</h1>
      </div>

      <form
        action={async (fd) => { "use server"; await updateProfileAction(fd); }}
        className="space-y-2 rounded-xl border border-clay-200 bg-clay-50 p-3 shadow-sm"
      >
        <h2 className="font-display font-semibold text-clay-900">{c.profile}</h2>
        <label className="block">
          <span className="text-sm text-clay-700">{c.name}</span>
          <input name="displayName" defaultValue={data.profile.displayName} required
            className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3" />
        </label>
        <label className="block">
          <span className="text-sm text-clay-700">{c.cycleStartDay}</span>
          <input name="cycleStartDay" type="number" min={1} max={31} defaultValue={data.profile.cycleStartDay} required
            className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3 font-mono tabular-nums" />
        </label>
        <label className="block">
          <span className="text-sm text-clay-700">{c.defaultSalary}</span>
          <input name="defaultSalary" type="number" step="0.01" min={0} defaultValue={data.profile.defaultSalary ?? ""}
            className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3 font-mono tabular-nums" />
        </label>
        <button type="submit" className="w-full rounded-lg bg-terra-500 p-3 text-clay-50">{c.save}</button>
      </form>

      <form
        action={async (fd) => { "use server"; await setCycleSalaryAction(fd); }}
        className="space-y-2 rounded-xl border border-clay-200 bg-clay-50 p-3 shadow-sm"
      >
        <h2 className="font-display font-semibold text-clay-900">{c.currentCycleSalary}</h2>
        <input type="hidden" name="cycleId" value={data.cycle.id} />
        <label className="block">
          <span className="text-sm text-clay-700">{c.salary}</span>
          <input name="salary" type="number" step="0.01" min={0} defaultValue={data.cycle.salary ?? ""}
            className="mt-1 w-full rounded-lg border border-clay-300 bg-clay-50 p-3 font-mono tabular-nums" />
        </label>
        <button type="submit" className="w-full rounded-lg bg-terra-500 p-3 text-clay-50">{c.save}</button>
      </form>

      <Link
        href="/settings/mappings"
        className="flex h-12 w-full items-center justify-between rounded-xl border border-clay-200 bg-clay-50 px-3 font-sans text-clay-900 shadow-sm"
      >
        <span>{copy.mappings.settingsLink}</span>
        <span aria-hidden className="text-clay-400">›</span>
      </Link>
    </main>
  );
}
