export class InvalidMobileError extends Error {
  constructor() {
    super("Mobile is invalid");
    this.name = "InvalidMobileError";
  }
}

export function normalizeMobile(input: unknown): string {
  if (typeof input !== "string") throw new InvalidMobileError();
  const compact = input.trim().replace(/[\s()-]/g, "");
  if (/^1\d{10}$/.test(compact)) return `+86${compact}`;
  if (/^\+\d{8,15}$/.test(compact)) return compact;
  throw new InvalidMobileError();
}
