import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { he } from "@/config/strings";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getData } from "@/lib/data";
import { countPushDevices } from "@/lib/push/send";
import { isDemoMode } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";
import { formatShortDate, formatTime } from "@/lib/utils/dates";
import { BroadcastForm } from "./broadcast-form";
import { BROADCAST_LINKS } from "./links";
import { ResendButton } from "./resend-button";

const t = he.admin.broadcast;

async function loadHistory() {
  if (isDemoMode()) return [];
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("push_broadcasts")
    .select("id, title, body, url, sent_count, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const [devices, history, team] = await Promise.all([countPushDevices(), loadHistory(), getData().getTeam()]);
  const demo = isDemoMode();
  const notice = demo ? he.admin.demoBanner : devices === null ? t.notConfigured : devices === 0 ? t.noDevices : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-muted">{t.intro}</p>
        {devices ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-team">
            <Bell className="size-4" aria-hidden />
            {t.devices(devices)}
          </p>
        ) : null}
      </header>

      {notice ? (
        <p role="status" className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
          {notice}
        </p>
      ) : null}

      <BroadcastForm devices={devices ?? 0} appName={team.shortName} disabled={demo || !devices} />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">{t.history}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">{t.noHistory}</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold" data-user-content>
                    {item.title}
                  </p>
                  {item.body ? (
                    <p className="line-clamp-2 text-sm text-muted" data-user-content>
                      {item.body}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">
                    {formatShortDate(item.created_at)} · {formatTime(item.created_at)} ·{" "}
                    {BROADCAST_LINKS.find((l) => l.url === item.url)?.label ?? item.url}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge tone={item.sent_count > 0 ? "win" : "neutral"}>{t.historyCount(item.sent_count)}</Badge>
                  <ResendButton broadcastId={item.id} title={item.title} devices={devices ?? 0} disabled={demo || !devices} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
