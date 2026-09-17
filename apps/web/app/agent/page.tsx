export const dynamic = "force-dynamic";
import { entryEnabled } from "../acquisition/server.js";
import { SupportingRoleWorkspace } from "../supporting-role-workspace.js";
import { withdrawalEnabled } from "../withdrawals/server.js";

export default function AgentPage() {
  return (
    <SupportingRoleWorkspace
      role="AGENT"
      acquisitionEnabled={entryEnabled()}
      withdrawalEnabled={withdrawalEnabled()}
    />
  );
}
