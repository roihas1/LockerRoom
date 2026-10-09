import { he } from "@/config/strings";

export function DemoBanner() {
  return (
    <div className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm font-medium text-warning">
      {he.admin.demoBanner}
    </div>
  );
}
