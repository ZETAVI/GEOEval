export const dynamic = "force-dynamic";
import { withdrawalEnabled } from "../../../withdrawals/server.js";
import { SupportWorkspace } from "../../../support/workspace.js";
export default async function Page({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return (
    <SupportWorkspace
      role="ADMINISTRATOR"
      ticketId={ticketId}
      withdrawalEnabled={withdrawalEnabled()}
    />
  );
}
