import Link from "next/link";
import {
  Compass,
  Home,
  CheckSquare,
  Calendar,
  BookOpen,
  Activity,
  ArrowRight,
} from "lucide-react";
import { SurfaceCard } from "@/components/ui/surface-card";

export default function NotFound() {
  const quickLinks = [
    { href: "/tasks", label: "Tasks & Goals", icon: CheckSquare },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/library", label: "Library", icon: BookOpen },
    { href: "/habits", label: "Habits", icon: Activity },
  ];

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-full max-w-lg space-y-6">
        {/* Editorial Icon Capsule */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orbit-accent-soft text-orbit-accent shadow-orbit-xs">
          <Compass className="h-7 w-7" aria-hidden="true" />
        </div>

        {/* Header Block */}
        <div className="space-y-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-orbit-accent">
            404 — Page Not Found
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-orbit-text">
            Lost in Orbit
          </h1>
          <p className="text-sm text-orbit-text-secondary max-w-md mx-auto leading-relaxed">
            The page you are looking for does not exist in your workspace. It may have been moved, renamed, or archived.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2 flex justify-center">
          <Link
            href="/"
            className="inline-flex min-h-[44px] sm:min-h-[38px] items-center justify-center gap-2 rounded-orbit-control bg-orbit-accent px-5 py-2.5 text-xs font-semibold text-orbit-accent-fg shadow-orbit-xs hover:bg-orbit-accent-hover focus-visible:ring-2 focus-visible:ring-orbit-ring focus-visible:ring-offset-2 transition-all"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

        {/* Quick Navigation Cards */}
        <div className="pt-4 text-left">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-orbit-text-muted text-center sm:text-left">
            Or jump directly to
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickLinks.map(({ href, label, icon: Icon }) => (
              <SurfaceCard
                key={href}
                as="div"
                className="group flex flex-col justify-between p-3 rounded-orbit-card border border-orbit-border bg-orbit-surface hover:border-orbit-border-strong hover:bg-orbit-surface-secondary transition-all"
              >
                <Link href={href} className="flex flex-col gap-2 h-full">
                  <div className="flex items-center justify-between">
                    <Icon className="h-4 w-4 text-orbit-accent group-hover:scale-110 transition-transform" />
                    <ArrowRight className="h-3 w-3 text-orbit-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-xs font-medium text-orbit-text group-hover:text-orbit-accent transition-colors">
                    {label}
                  </span>
                </Link>
              </SurfaceCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

