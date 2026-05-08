import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ImageDown, Maximize2, History, Sparkles, Zap, ShieldCheck, Layers } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DBK Image Resizer & Compressor — Premium SaaS" },
      { name: "description", content: "Resize, compress and convert images instantly in your browser. JPG, PNG, WEBP." },
    ],
  }),
  component: Index,
});

function Index() {
  const tools = [
    {
      to: "/compress" as const,
      icon: ImageDown,
      title: "Compress",
      desc: "Shrink file sizes with quality control.",
    },
    {
      to: "/resize" as const,
      icon: Maximize2,
      title: "Resize",
      desc: "Set custom width with auto height.",
    },
    {
      to: "/history" as const,
      icon: History,
      title: "History",
      desc: "Review past optimizations.",
    },
  ];
  const stats = [
    { icon: Zap, label: "Instant", value: "0ms" },
    { icon: ShieldCheck, label: "Private", value: "100%" },
    { icon: Layers, label: "Formats", value: "3+" },
  ];
  return (
    <AppShell>
      <div className="space-y-10 animate-fade-in-up">
        <section className="rounded-3xl glass-strong p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">Powered by your browser • Zero uploads</span>
            </div>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold tracking-tight">
              <span className="text-gradient">Image Studio</span>
              <br />
              for the modern web
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Resize, compress and convert images at lightning speed. Beautiful results,
              private by design.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/compress"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 px-5 py-3 text-sm font-semibold text-primary-foreground glow hover:opacity-90 transition"
              >
                <ImageDown className="h-4 w-4" /> Start compressing
              </Link>
              <Link
                to="/resize"
                className="inline-flex items-center gap-2 rounded-xl glass px-5 py-3 text-sm font-semibold hover:bg-white/10 transition"
              >
                <Maximize2 className="h-4 w-4" /> Resize images
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl glass p-5 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Tools</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {tools.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="group rounded-2xl glass p-6 hover:scale-[1.03] hover:bg-white/5 transition-all"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary group-hover:glow">
                  <t.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{t.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
