import type { Account } from "@geoeval/api-client";

export type PostLoginRoute =
  | { kind: "customer-brand-check" }
  | { kind: "redirect"; path: "/admin/media" }
  | { kind: "unsupported-role" };

export function postLoginRoute(role: Account["role"]): PostLoginRoute {
  if (role === "TERMINAL_CUSTOMER") return { kind: "customer-brand-check" };
  if (role === "ADMINISTRATOR") {
    return { kind: "redirect", path: "/admin/media" };
  }
  return { kind: "unsupported-role" };
}
