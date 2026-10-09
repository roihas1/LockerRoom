import { Navigation } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { he } from "@/config/strings";
import { wazeUrl } from "@/lib/maps";
import { cn } from "@/lib/utils/cn";

export function WazeButton({ address, className }: { address: string; className?: string }) {
  return (
    <a
      href={wazeUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      title={he.games.navigate}
      className={cn(buttonVariants({ variant: "secondary", size: "sm" }), className)}
    >
      <Navigation aria-hidden />
      {he.games.waze}
    </a>
  );
}
