import { notFound } from "next/navigation.js";
import { withdrawalEnabled } from "../../../withdrawals/server.js";
import { WithdrawalWorkspace } from "../../../agent/withdrawals/workspace.js";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!withdrawalEnabled()) notFound();
  const { id } = await params;
  return <WithdrawalWorkspace role="ADMINISTRATOR" id={id} />;
}
