import { createFileRoute } from "@tanstack/react-router";
import { DrillApp } from "@/components/drill-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <DrillApp />;
}
