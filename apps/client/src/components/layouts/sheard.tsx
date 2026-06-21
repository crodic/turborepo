import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

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
  ...props
}: React.ComponentProps<"a"> & LinkItemType) {
  return (
    <a
      className={cn("hover:bg-accent flex gap-x-2 rounded-md p-2", className)}
      href={href}
      {...props}
    >
      <div className="bg-card flex aspect-square size-12 items-center justify-center rounded-md border text-sm shadow-sm">
        <Icon className="text-foreground size-5" />
      </div>
      <div className="flex flex-col items-start justify-center">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground line-clamp-2 text-xs">
          {description}
        </span>
      </div>
    </a>
  );
}
