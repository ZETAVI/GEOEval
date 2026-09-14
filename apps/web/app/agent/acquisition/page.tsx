export const dynamic = "force-dynamic";
import { notFound } from "next/navigation.js";
import { entryEnabled } from "../../acquisition/server.js";
import { AgentAcquisitionWorkspace } from "./workspace.js";
export default function Page() {
  if (!entryEnabled()) notFound();
  return <AgentAcquisitionWorkspace />;
}
