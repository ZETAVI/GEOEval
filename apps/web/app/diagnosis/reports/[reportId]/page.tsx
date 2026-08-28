import { ReportDetailWorkspace } from "./report-detail-workspace.js";

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ brandId?: string }>;
}) {
  const [{ reportId }, { brandId }] = await Promise.all([params, searchParams]);
  return <ReportDetailWorkspace reportId={reportId} brandId={brandId ?? ""} />;
}
