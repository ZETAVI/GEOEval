import { describe, expect, it } from "vitest";

import { postLoginRoute } from "../app/enter/post-login-route.js";

describe("post-login role routing", () => {
  it("routes administrators to the administrator home without entering the Brand flow", () => {
    expect(postLoginRoute("ADMINISTRATOR")).toEqual({
      kind: "redirect",
      path: "/admin",
    });
  });

  it("preserves the terminal-customer first-brand decision", () => {
    expect(postLoginRoute("TERMINAL_CUSTOMER")).toEqual({
      kind: "customer-brand-check",
    });
  });

  it("routes operations and agent accounts to their fixed honest shells", () => {
    expect(postLoginRoute("OPERATIONS")).toEqual({
      kind: "redirect",
      path: "/operations",
    });
    expect(postLoginRoute("AGENT")).toEqual({
      kind: "redirect",
      path: "/agent",
    });
  });

  it("fails closed when a future server role is not in the generated contract", () => {
    expect(() => postLoginRoute("UNKNOWN_ROLE" as never)).toThrowError(
      "UNSUPPORTED_ACCOUNT_ROLE",
    );
  });
});
