export const dynamic = "force-dynamic";
import { notFound } from "next/navigation.js";
import type { AgencyWithdrawalFilter } from "@geoeval/api-client";
import { withdrawalEnabled } from "../../withdrawals/server.js";
import { WithdrawalWorkspace } from "../../agent/withdrawals/workspace.js";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!withdrawalEnabled()) notFound();
  const raw = await searchParams;
  const filter: AgencyWithdrawalFilter = {};
  if (typeof raw.agentId === "string" && raw.agentId)
    filter.agentId = raw.agentId;
  if (typeof raw.status === "string" && raw.status)
    filter.status = raw.status as NonNullable<AgencyWithdrawalFilter["status"]>;
  if (typeof raw.cursor === "string" && raw.cursor)
    filter.cursor = Number(raw.cursor);
  return <WithdrawalWorkspace role="ADMINISTRATOR" filter={filter} />;
}
