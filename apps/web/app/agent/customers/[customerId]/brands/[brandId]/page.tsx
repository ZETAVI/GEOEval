export const dynamic = "force-dynamic";
import { notFound } from "next/navigation.js";
import { entryEnabled } from "../../../../../acquisition/server.js";
import { AgentCustomersWorkspace } from "../../.././workspace.js";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; brandId: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  if (!entryEnabled()) notFound();
  const p = await params;
  const q = await searchParams;
  return (
    <AgentCustomersWorkspace
      customerId={p.customerId}
      brandId={p.brandId}
      {...(q.cursor ? { cursor: q.cursor } : {})}
    />
  );
}
