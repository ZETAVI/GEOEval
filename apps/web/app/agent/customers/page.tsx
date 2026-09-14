export const dynamic = "force-dynamic";
import { notFound } from "next/navigation.js";
import { entryEnabled } from "../../acquisition/server.js";
import { AgentCustomersWorkspace } from "./workspace.js";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  if (!entryEnabled()) notFound();
  const q = await searchParams;
  return (
    <AgentCustomersWorkspace {...(q.cursor ? { cursor: q.cursor } : {})} />
  );
}
