import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function FilterChips({ items, label }: { items: { href: string; label: string; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 mb-5 overflow-x-auto px-4 scrollbar-none">
      <ul className="flex gap-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              scroll={false}
              aria-current={i.active ? "page" : undefined}
              className={cn(
                "block rounded-full border px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
                i.active ? "border-team bg-team text-black" : "border-border bg-surface text-muted hover:text-text",
              )}
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
