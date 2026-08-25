export type CreateFoundationRecordCommand = {
  name: string;
  forceRollback?: boolean;
};

export type FoundationRecordView = {
  id: string;
  name: string;
  status: "ACCEPTED" | "PROCESSED";
  correlationId: string;
  effects: Array<{
    id: string;
    businessKey: string;
    result: string;
  }>;
};

export type FoundationBacklogView = {
  pending: number;
  dispatched: number;
};

export type FoundationJobData = {
  outboxEventId: string;
  recordId: string;
  businessKey: string;
  correlationId: string;
};
