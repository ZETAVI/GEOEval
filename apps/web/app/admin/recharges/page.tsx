export const dynamic = "force-dynamic";
import { withdrawalEnabled } from "../../withdrawals/server.js";
import { AdminRechargeWorkspace } from "./workspace.js";
export default function Page() {
  return <AdminRechargeWorkspace withdrawalEnabled={withdrawalEnabled()} />;
}
