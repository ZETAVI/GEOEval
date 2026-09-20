import { z } from "zod";

const optionsSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("prepare"),
      accountId: z.string().uuid(),
      idempotencyKey: z.string().uuid(),
      cashierFile: z
        .string()
        .regex(
          /^\/run\/geoeval-alipay-acceptance\/[A-Za-z0-9._-]{1,100}\.html$/,
        ),
    })
    .strict(),
  z
    .object({
      mode: z.literal("reconcile"),
      accountId: z.string().uuid(),
      orderId: z.string().uuid(),
    })
    .strict(),
]);

export function parseAlipayRechargeAcceptanceOptions(argv: string[]) {
  const values: Record<string, string> = { mode: argv[0] ?? "" };
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index],
      value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined)
      throw new Error("RECHARGE_ACCEPTANCE_OPTIONS_INVALID");
    const name =
      key === "--account-id"
        ? "accountId"
        : key === "--idempotency-key"
          ? "idempotencyKey"
          : key === "--cashier-file"
            ? "cashierFile"
            : key === "--order-id"
              ? "orderId"
              : key;
    if (Object.hasOwn(values, name))
      throw new Error("RECHARGE_ACCEPTANCE_OPTIONS_INVALID");
    values[name] = value;
  }
  return optionsSchema.parse(values);
}
