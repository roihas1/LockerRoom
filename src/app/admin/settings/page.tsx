import { SettingsForms } from "@/app/admin/settings/settings-forms";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/env";

export default async function AdminSettingsPage() {
  const data = await getAdminData();
  const [team, seasons] = await Promise.all([data.getTeam(), data.getSeasons()]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{he.admin.settings}</h1>
      <SettingsForms team={team} seasons={seasons} demo={isDemoMode()} />
    </div>
  );
}
