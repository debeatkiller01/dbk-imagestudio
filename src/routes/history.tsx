import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useHistory, clearHistory } from "@/lib/history-store";
import { formatBytes } from "@/lib/image-processor";
import { Button } from "@/components/ui/button";
import { Trash2, ImageIcon, ImageDown } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — DBK Image Studio" },
      { name: "description", content: "Recent image optimizations." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const list = useHistory();
  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="text-gradient">History</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Last {list.length} optimization{list.length !== 1 ? "s" : ""} on this device.
            </p>
          </div>
          {list.length > 0 && (
            <Button variant="outline" onClick={clearHistory}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear
            </Button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl glass-strong p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <p className="font-semibold">No history yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Compress or resize an image to see it here.
            </p>
            <Link
              to="/compress"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground glow"
            >
              <ImageDown className="h-4 w-4" /> Start now
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl glass overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/50">
                  <th className="p-4">File</th>
                  <th className="p-4 hidden sm:table-cell">Dimensions</th>
                  <th className="p-4">Original</th>
                  <th className="p-4">Result</th>
                  <th className="p-4">Saved</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const saved = Math.max(0, 1 - e.resultSize / e.originalSize);
                  return (
                    <tr key={e.id} className="border-b border-border/30 hover:bg-white/5">
                      <td className="p-4 font-medium truncate max-w-[180px]">{e.name}</td>
                      <td className="p-4 hidden sm:table-cell text-muted-foreground">
                        {e.resultWidth}×{e.resultHeight}
                      </td>
                      <td className="p-4 text-muted-foreground">{formatBytes(e.originalSize)}</td>
                      <td className="p-4">{formatBytes(e.resultSize)}</td>
                      <td className="p-4 text-primary font-semibold">
                        −{(saved * 100).toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}