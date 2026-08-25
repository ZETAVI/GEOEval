import type { components } from "./schema.js";

export type FoundationRecord =
  components["schemas"]["FoundationRecordResponse"];

export async function createFoundationRecord(
  apiBaseUrl: string,
  name: string,
): Promise<FoundationRecord> {
  const response = await fetch(`${apiBaseUrl}/foundation/records`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(`Create failed with status ${response.status}`);
  }
  return (await response.json()) as FoundationRecord;
}

export async function getFoundationRecord(
  apiBaseUrl: string,
  id: string,
): Promise<FoundationRecord> {
  const response = await fetch(`${apiBaseUrl}/foundation/records/${id}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Read failed with status ${response.status}`);
  }
  return (await response.json()) as FoundationRecord;
}
