import { SupportWorkspace } from "./workspace.js";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    orderId?: string;
    rechargeOrderId?: string;
    invoice?: string;
  }>;
}) {
  const { orderId, rechargeOrderId, invoice } = await searchParams;
  return (
    <SupportWorkspace
      role="TERMINAL_CUSTOMER"
      publishingOrderId={orderId}
      rechargeOrderId={rechargeOrderId}
      invoiceNumber={invoice}
    />
  );
}
