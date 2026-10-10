import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";

export default async function AdminCoachesPage() {
  const coaches = await getAdminData().then((d) => d.getCoaches({ includeInactive: true }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{he.admin.coaches}</h1>
        <Button asChild>
          <Link href="/admin/coaches/new">{he.admin.newCoach}</Link>
        </Button>
      </header>

      {coaches.length === 0 ? (
        <p className="text-muted">{he.admin.noItems}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-surface-2 text-muted">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">{he.admin.playerForm.name}</th>
                <th className="px-3 py-2 text-start font-semibold">{he.admin.coachForm.role}</th>
                <th className="px-3 py-2 text-start font-semibold">{he.admin.playerForm.hashtag}</th>
                <th className="px-3 py-2 text-start font-semibold">{he.admin.actionsColumn}</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2" data-user-content>
                    {c.name}
                    {!c.isActive ? (
                      <Badge tone="neutral" className="ms-2">
                        {he.roster.inactive}
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-3 py-2" data-user-content>
                    {c.role ?? he.stats.noValue}
                  </td>
                  <td className="px-3 py-2" data-user-content>
                    {c.hashtag ? `#${c.hashtag}` : he.stats.noValue}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/coaches/${c.id}`} className="font-semibold text-team hover:underline">
                      {he.actions.edit}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
