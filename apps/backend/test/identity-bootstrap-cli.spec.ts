import { describe, expect, it } from "vitest";

import { parseBootstrapOptions } from "../src/identity/presentation/bootstrap-options.js";

describe("Bootstrap CLI options", () => {
  it("accepts the pnpm separator without treating it as an option", () => {
    expect(
      parseBootstrapOptions([
        "--",
        "--mobile=13800138901",
        "--key-id=deploy/test/cli-1",
        "--secret-stdin",
      ]),
    ).toEqual({
      mobile: "13800138901",
      keyId: "deploy/test/cli-1",
    });
  });

  it("rejects missing, duplicate, or unknown options", () => {
    for (const options of [
      ["--mobile=13800138901", "--key-id=deploy/test/cli-1"],
      [
        "--mobile=13800138901",
        "--mobile=13800138902",
        "--key-id=deploy/test/cli-1",
        "--secret-stdin",
      ],
      [
        "--mobile=13800138901",
        "--key-id=deploy/test/cli-1",
        "--secret=plaintext",
      ],
    ]) {
      expect(() => parseBootstrapOptions(options)).toThrow(
        "Bootstrap options are invalid",
      );
    }
  });
});
