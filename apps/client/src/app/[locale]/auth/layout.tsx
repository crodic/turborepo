import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className={cn("min-h-screen w-full")}>
      <div className="grid min-h-screen lg:grid-cols-2">
        <div
          className={cn(
            "relative hidden flex-col justify-between overflow-hidden p-10 lg:flex",
            "bg-accent text-white"
          )}
        >
          <img
            src="/auth.jpg"
            alt="img"
            className="absolute top-1/2 left-1/2 h-full -translate-x-1/2 -translate-y-1/2 object-cover"
          ></img>

          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
          <Link href="/" className="relative z-10 flex items-center gap-2">
            <span className="dancing-script-font text-primary text-4xl font-semibold text-shadow-2xs">
              Visel Art
            </span>
          </Link>
          <div className="relative z-10 max-w-md">
            <p className="text-muted dark:text-muted-foreground mb-2 text-sm">
              Welcome to Visel Art
            </p>
            <h2 className="text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
              Convert your ideas into successful business
            </h2>
          </div>
        </div>

        {/* Right Side - Form */}
        {children}
      </div>
    </section>
  );
}
