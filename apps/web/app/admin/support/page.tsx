export const dynamic = "force-dynamic";
import { withdrawalEnabled } from "../../withdrawals/server.js";
import { SupportWorkspace } from "../../support/workspace.js";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  return (
    <SupportWorkspace
      role="ADMINISTRATOR"
      publishingOrderId={orderId}
      withdrawalEnabled={withdrawalEnabled()}
    />
  );
}
