import "reflect-metadata";

import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { RoleGuard } from "../src/identity/presentation/role.guard.js";

describe("RoleGuard dependency contract", () => {
  it("declares Reflector explicitly for metadata-light tsx runtimes", () => {
    const dependencies = Reflect.getMetadata("self:paramtypes", RoleGuard) as
      Array<{ index: number; param: unknown }> | undefined;

    expect(dependencies).toEqual([{ index: 0, param: Reflector }]);
  });
});
