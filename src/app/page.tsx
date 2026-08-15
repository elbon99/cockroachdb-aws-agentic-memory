import { ContextSealDemo } from "@/components/contextseal-demo";
import { getDemoSnapshot } from "@/lib/memory-graph/demo-service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <ContextSealDemo initialSnapshot={await getDemoSnapshot()} />;
}
