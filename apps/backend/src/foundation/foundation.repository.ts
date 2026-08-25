import type {
  FoundationBacklogView,
  FoundationJobData,
  FoundationRecordView,
} from "./foundation.types.js";

export const FOUNDATION_REPOSITORY = Symbol("FOUNDATION_REPOSITORY");

export type DeliverableOutboxEvent = {
  id: string;
  recordId: string;
  status: "PENDING" | "DISPATCHED";
  correlationId: string;
};

export interface FoundationRepository {
  createRecordWithOutbox(input: {
    name: string;
    correlationId: string;
    forceRollback: boolean;
  }): Promise<{ id: string }>;
  findRecord(id: string): Promise<FoundationRecordView | undefined>;
  getBacklog(): Promise<FoundationBacklogView>;
  findDeliverableOutbox(limit: number): Promise<DeliverableOutboxEvent[]>;
  markOutboxDispatched(id: string): Promise<void>;
  applyEffect(data: FoundationJobData): Promise<void>;
}
