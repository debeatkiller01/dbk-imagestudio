import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, ImageDown, Maximize2, History, Sparkles } from "lucide-react";
import { Bubbles } from "./Bubbles";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/compress", label: "Compress", icon: ImageDown },
  { to: "/resize", label: "Resize", icon: Maximize2 },
  { to: "/history", label: "History", icon: History },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="relative min-h-screen text-foreground">
      <Bubbles />
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong border-b border-border/50">
        <div className="flex h-16 items-center justify-between px-4 md:px-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 glow group-hover:animate-pulse-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight">DBK</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Image Studio
              </span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            All processing happens in your browser
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex sticky top-16 h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r border-border/50 glass p-4">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-primary/15 text-primary glow"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-xl glass p-4 text-xs">
            <p className="font-semibold text-foreground">Pro tip</p>
            <p className="mt-1 text-muted-foreground">
              WebP gives ~30% smaller files than JPEG at similar quality.
            </p>
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-30 glass-strong rounded-2xl p-1.5 flex gap-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] ${
                  active ? "bg-primary/20 text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-10 pb-24 md:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}