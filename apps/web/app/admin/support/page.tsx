import { SupportWorkspace } from "../../support/workspace.js";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  return <SupportWorkspace role="ADMINISTRATOR" publishingOrderId={orderId} />;
}
