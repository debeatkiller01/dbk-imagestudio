import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/resize")({
  head: () => ({
    meta: [
      { title: "Resize Images — DBK Image Studio" },
      { name: "description", content: "Resize images by width with proportional height." },
    ],
  }),
  component: () => (
    <AppShell>
      <Workspace
        title="Resize Images"
        subtitle="Set a target width — height scales proportionally."
        mode="both"
      />
    </AppShell>
  ),
});