export const PRODUCT_OUTBOX_REPOSITORY = Symbol("PRODUCT_OUTBOX_REPOSITORY");

export type DeliverableProductOutbox = {
  id: string;
  status: "PENDING" | "DISPATCHED";
};

export type ProductOutboxWorkEvent = {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  correlationId: string;
  createdAt: Date;
};

export interface ProductOutboxRepository {
  findDeliverable(limit: number): Promise<DeliverableProductOutbox[]>;
  findEvent(id: string): Promise<ProductOutboxWorkEvent | undefined>;
  markDispatched(id: string): Promise<void>;
  markCompleted(id: string): Promise<void>;
}
