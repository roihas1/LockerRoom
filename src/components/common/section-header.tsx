import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeader({
  title,
  href,
  linkLabel,
  icon,
  as: Tag = "h2",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  icon?: ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <Tag className="flex items-center gap-2 font-display text-xl font-extrabold md:text-2xl">
        {icon}
        {title}
      </Tag>
      {href && linkLabel ? (
        <Link href={href} className="flex items-center gap-0.5 text-sm font-semibold text-team hover:underline">
          {linkLabel}
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
