import { CommissionWorkspace } from "../../../agent/commissions/workspace.js";
export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <CommissionWorkspace role="AGENT" orderId={orderId} />;
}
