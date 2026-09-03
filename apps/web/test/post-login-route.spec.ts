import { describe, expect, it } from "vitest";

import { postLoginRoute } from "../app/enter/post-login-route.js";

describe("post-login role routing", () => {
  it("routes administrators to Media Supply without entering the Brand flow", () => {
    expect(postLoginRoute("ADMINISTRATOR")).toEqual({
      kind: "redirect",
      path: "/admin/media",
    });
  });

  it("preserves the terminal-customer first-brand decision", () => {
    expect(postLoginRoute("TERMINAL_CUSTOMER")).toEqual({
      kind: "customer-brand-check",
    });
  });

  it.each(["OPERATIONS", "AGENT"] as const)(
    "does not route %s into a customer or administrator workspace",
    (role) => {
      expect(postLoginRoute(role)).toEqual({ kind: "unsupported-role" });
    },
  );
});
