export const dynamic = "force-dynamic";
import { notFound } from "next/navigation.js";
import { entryEnabled } from "../../../../../../../acquisition/server.js";
import { AgentCustomersWorkspace } from "../../../../.././workspace.js";
export default async function Page({
  params,
}: {
  params: Promise<{ customerId: string; brandId: string; reportId: string }>;
}) {
  if (!entryEnabled()) notFound();
  const p = await params;
  return (
    <AgentCustomersWorkspace
      customerId={p.customerId}
      brandId={p.brandId}
      reportId={p.reportId}
    />
  );
}
