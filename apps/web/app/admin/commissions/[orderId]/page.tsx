export const dynamic = "force-dynamic";
import { CommissionWorkspace } from "../../../agent/commissions/workspace.js";
import { withdrawalEnabled } from "../../../withdrawals/server.js";
export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <CommissionWorkspace
      role="ADMINISTRATOR"
      orderId={orderId}
      withdrawalEnabled={withdrawalEnabled()}
    />
  );
}
