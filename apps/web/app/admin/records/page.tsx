export const dynamic = "force-dynamic";
import { withdrawalEnabled } from "../../withdrawals/server.js";
import { AdminRecordsWorkspace } from "./workspace.js";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AdminRecordsWorkspace
      initial={{
        accountId: typeof params.accountId === "string" ? params.accountId : "",
        referenceId:
          typeof params.referenceId === "string" ? params.referenceId : "",
        mobile: typeof params.mobile === "string" ? params.mobile : "",
        kind: typeof params.kind === "string" ? params.kind : "",
        createdFrom:
          typeof params.createdFrom === "string" ? params.createdFrom : "",
        createdBefore:
          typeof params.createdBefore === "string" ? params.createdBefore : "",
      }}
      withdrawalEnabled={withdrawalEnabled()}
    />
  );
}
