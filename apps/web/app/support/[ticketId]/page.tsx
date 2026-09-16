import { SupportWorkspace } from "../workspace.js";
export default async function Page({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return <SupportWorkspace role="TERMINAL_CUSTOMER" ticketId={ticketId} />;
}
