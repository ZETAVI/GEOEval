/** Persisted acquisition budget. Consumers use these absolute dates, not timers. */
export function samplingCycleWindowData(createdAt: Date) {
  return {
    createdAt,
    samplingStartedAt: createdAt,
    samplingFallbackDueAt: new Date(createdAt.getTime() + 80_000),
    samplingDeadlineAt: new Date(createdAt.getTime() + 130_000),
  };
}
