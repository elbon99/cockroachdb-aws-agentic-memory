import { ContextSealDemo } from "@/components/contextseal-demo";
import { getReceiptSnapshot } from "@/lib/receipts/demo-service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <ContextSealDemo initialSnapshot={await getReceiptSnapshot()} />;
}
