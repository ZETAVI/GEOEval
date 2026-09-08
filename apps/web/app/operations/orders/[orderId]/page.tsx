import { DeliveryWorkspace } from "../workspace.js";
export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <DeliveryWorkspace orderId={orderId} />;
}
