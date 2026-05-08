import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/compress")({
  head: () => ({
    meta: [
      { title: "Compress Images — DBK Image Studio" },
      { name: "description", content: "Reduce image file sizes with adjustable quality." },
    ],
  }),
  component: () => (
    <AppShell>
      <Workspace
        title="Compress Images"
        subtitle="Drop images and tune quality to shrink file size."
        mode="both"
      />
    </AppShell>
  ),
});