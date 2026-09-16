import { CommissionWorkspace } from "../../agent/commissions/workspace.js";
import type { CommissionFilter } from "@geoeval/api-client";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filter: CommissionFilter = {};
  for (const k of ["agentId", "orderId", "state", "cursor"] as const)
    if (typeof raw[k] === "string" && raw[k])
      Object.assign(filter, { [k]: raw[k] });
  return <CommissionWorkspace role="ADMINISTRATOR" filter={filter} />;
}
