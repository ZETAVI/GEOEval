export const dynamic = "force-dynamic";
import { withdrawalEnabled } from "../../withdrawals/server.js";
import { DeliveryWorkspace } from "../../operations/orders/workspace.js";
export default function Page() {
  return <DeliveryWorkspace admin withdrawalEnabled={withdrawalEnabled()} />;
}
