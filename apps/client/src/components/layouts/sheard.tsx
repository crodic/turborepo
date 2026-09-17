import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import React from "react";

export type LinkItemType = {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export function LinkItem({
  label,
  description,
  icon: Icon,
  className,
  href,
  onClick,
}: LinkItemType & {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      className={cn(
        "hover:bg-accent hover:text-accent-foreground flex gap-x-3 rounded-lg p-2.5 transition-colors",
        className
      )}
      href={href}
      onClick={onClick}
    >
      <div className="bg-primary/10 text-primary border-primary/20 flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg border shadow-2xs">
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col justify-center">
        <span className="text-sm leading-tight font-semibold">{label}</span>
        {description && (
          <span className="text-muted-foreground line-clamp-1 text-xs">
            {description}
          </span>
        )}
      </div>
    </Link>
  );
}
