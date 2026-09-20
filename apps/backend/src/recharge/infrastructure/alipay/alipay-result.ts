export type AlipayResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: {
        kind: "INVALID_INPUT" | "INVALID_NOTIFICATION" | "UNRESOLVED";
        code: string;
        recovery: "RETRY" | "VERIFY" | "REVIEW";
        httpStatus?: number;
      };
    };
