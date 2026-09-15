import { SupportWorkspace } from "./workspace.js";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  return (
    <SupportWorkspace role="TERMINAL_CUSTOMER" publishingOrderId={orderId} />
  );
}
