import type { Account } from "@geoeval/api-client";

export type PostLoginRoute =
  | { kind: "customer-brand-check" }
  | {
      kind: "redirect";
      path: "/admin" | "/operations" | "/agent";
    };

type SupportingAccountRole = Exclude<Account["role"], "TERMINAL_CUSTOMER">;

export function postLoginRoute(role: Account["role"]): PostLoginRoute {
  if (role === "TERMINAL_CUSTOMER") return { kind: "customer-brand-check" };
  return { kind: "redirect", path: roleHomePath(role) };
}

export function roleHomePath(role: "TERMINAL_CUSTOMER"): "/brands";
export function roleHomePath(
  role: SupportingAccountRole,
): "/admin" | "/operations" | "/agent";
export function roleHomePath(
  role: Account["role"],
): "/brands" | "/admin" | "/operations" | "/agent";
export function roleHomePath(
  role: Account["role"],
): "/brands" | "/admin" | "/operations" | "/agent" {
  switch (role) {
    case "TERMINAL_CUSTOMER":
      return "/brands";
    case "ADMINISTRATOR":
      return "/admin";
    case "OPERATIONS":
      return "/operations";
    case "AGENT":
      return "/agent";
    default:
      throw new Error("UNSUPPORTED_ACCOUNT_ROLE");
  }
}
