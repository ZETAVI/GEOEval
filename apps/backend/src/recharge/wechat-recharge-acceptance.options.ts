import { z } from "zod";

const optionsSchema = z
  .object({
    mode: z.literal("prepay-close"),
    accountId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export function parseWechatRechargeAcceptanceOptions(argv: string[]) {
  const values: Record<string, string> = { mode: argv[0] ?? "" };
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index],
      value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined)
      throw new Error("RECHARGE_ACCEPTANCE_OPTIONS_INVALID");
    values[
      key === "--account-id"
        ? "accountId"
        : key === "--idempotency-key"
          ? "idempotencyKey"
          : key
    ] = value;
  }
  const parsed = optionsSchema.parse(values);
  return {
    mode: parsed.mode,
    request: {
      accountId: parsed.accountId,
      idempotencyKey: parsed.idempotencyKey,
    },
  } as const;
}
