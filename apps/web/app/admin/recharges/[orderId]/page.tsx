export const dynamic = "force-dynamic";
import { withdrawalEnabled } from "../../../withdrawals/server.js";
import { AdminRechargeWorkspace } from "../workspace.js";
export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <AdminRechargeWorkspace
      orderId={orderId}
      withdrawalEnabled={withdrawalEnabled()}
    />
  );
}
