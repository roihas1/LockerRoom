import { cn } from "@/lib/utils/cn";

export function StatTile({
  value,
  label,
  sublabel,
  className,
  size = "md",
}: {
  value: string;
  label: string;
  sublabel?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className={cn("card flex flex-col items-center justify-center gap-1 px-3 py-4 text-center", className)}>
      <bdi
        dir="ltr"
        className={cn(
          "num font-black leading-none",
          size === "lg" ? "text-5xl md:text-6xl" : size === "md" ? "text-3xl md:text-4xl" : "text-2xl",
        )}
      >
        {value}
      </bdi>
      <span className="text-sm font-semibold text-text/90">{label}</span>
      {sublabel ? <span className="text-[11px] font-medium tracking-wider text-muted">{sublabel}</span> : null}
    </div>
  );
}
