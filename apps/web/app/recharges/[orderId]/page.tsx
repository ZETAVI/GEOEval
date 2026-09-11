import { RechargeDetailWorkspace } from "../detail-workspace.js";
export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <RechargeDetailWorkspace orderId={orderId} />;
}
