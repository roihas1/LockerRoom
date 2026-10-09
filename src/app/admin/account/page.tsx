import { AccountForm } from "@/app/admin/account/account-form";
import { he } from "@/config/strings";
import { isDemoMode } from "@/lib/supabase/env";

export default function AdminAccountPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{he.admin.account}</h1>
      <AccountForm demo={isDemoMode()} />
    </div>
  );
}
