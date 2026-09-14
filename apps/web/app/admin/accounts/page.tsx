export const dynamic = "force-dynamic";
import { entryEnabled } from "../../acquisition/server.js";
import { AdminAccountsWorkspace } from "./workspace.js";

export default function AdminAccountsPage() {
  return <AdminAccountsWorkspace acquisitionEnabled={entryEnabled()} />;
}
