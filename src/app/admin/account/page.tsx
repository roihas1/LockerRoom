import { AccountForm } from "@/app/admin/account/account-form";
import { AdminClichePushToggle } from "@/components/admin/admin-cliche-push-toggle";
import { he } from "@/config/strings";
import { isDemoMode } from "@/lib/supabase/env";

export default function AdminAccountPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{he.admin.account}</h1>
      <AdminClichePushToggle />
      <AccountForm demo={isDemoMode()} />
    </div>
  );
}
