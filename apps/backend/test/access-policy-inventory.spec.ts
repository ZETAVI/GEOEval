import { RequestMethod, type INestApplication } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { ModulesContainer, Reflector } from "@nestjs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApp } from "../src/api-app.js";
import {
  CSRF_EXEMPT,
  PUBLIC_ACCESS,
  REQUIRED_ACCOUNT_ROLES,
} from "../src/identity/access/access.metadata.js";
import type { AccountRole } from "../src/identity/domain/identity.types.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

type RoutePolicy = {
  controller: string;
  handler: string;
  method: string;
  path: string;
  publicAccess: boolean;
  csrfExempt: boolean;
  roles?: AccountRole[];
};

const allRoles: AccountRole[] = [
  "TERMINAL_CUSTOMER",
  "OPERATIONS",
  "ADMINISTRATOR",
  "AGENT",
];

describe("complete controller access-policy inventory", () => {
  let app: INestApplication;
  let routes: RoutePolicy[];

  beforeAll(async () => {
    app = await createApiApp(loadIntegrationApiConfig(), false);
    await app.init();
    routes = discoverRoutePolicies(app);
  });
  afterAll(async () => app.close());

  it("keeps every registered product controller in one known policy family", () => {
    expect(
      [...new Set(routes.map((route) => route.controller))].sort(),
    ).toEqual(Object.keys(expectedControllerPolicies).sort());

    for (const route of routes) {
      const expected = expectedControllerPolicies[route.controller](
        route.handler,
      );
      expect(route, `${route.method} ${route.path}`).toMatchObject(expected);
    }
  });

  it("keeps public mutation and role metadata boundaries explicit", () => {
    const publicMutations = routes.filter(
      (route) =>
        route.publicAccess &&
        !["GET", "HEAD", "OPTIONS"].includes(route.method),
    );
    expect(
      publicMutations
        .filter((route) => !route.csrfExempt)
        .map((route) => `${route.method} ${route.path}`)
        .sort(),
    ).toEqual([
      "POST /agency/entry/resolve",
      "POST /identity/challenges",
      "POST /identity/sessions",
    ]);
    expect(
      publicMutations
        .filter((route) => route.csrfExempt)
        .every((route) => route.controller === "FoundationController"),
    ).toBe(true);
    expect(routes.filter((route) => route.publicAccess && route.roles)).toEqual(
      [],
    );
  });
});

const expectedControllerPolicies: Record<
  string,
  (
    handler: string,
  ) => Pick<RoutePolicy, "publicAccess" | "csrfExempt" | "roles">
> = {
  SupportController: (handler) => ({
    publicAccess: false,
    csrfExempt: false,
    roles:
      handler === "create"
        ? ["TERMINAL_CUSTOMER", "OPERATIONS"]
        : ["TERMINAL_CUSTOMER", "OPERATIONS", "ADMINISTRATOR"],
  }),
  CommissionTermsController: () => ({
    publicAccess: false,
    csrfExempt: false,
    roles: ["ADMINISTRATOR"],
  }),
  AgencyCustomerController: (handler) => ({
    publicAccess: false,
    csrfExempt: false,
    roles: [
      handler === "adminState" || handler === "transfer"
        ? "ADMINISTRATOR"
        : "AGENT",
    ],
  }),
  AcquisitionController: (handler) =>
    handler === "resolve"
      ? { publicAccess: true, csrfExempt: false }
      : {
          publicAccess: false,
          csrfExempt: false,
          roles: handler === "issue" ? ["ADMINISTRATOR"] : ["AGENT"],
        },
  DeliveryResolutionController: (handler) => ({
    publicAccess: false,
    csrfExempt: false,
    roles:
      handler === "settle"
        ? ["ADMINISTRATOR"]
        : handler === "targets"
          ? ["OPERATIONS", "ADMINISTRATOR"]
          : ["OPERATIONS"],
  }),
  DeliveryAssignmentController: (handler) => ({
    publicAccess: false,
    csrfExempt: false,
    roles:
      handler === "reassign"
        ? ["ADMINISTRATOR"]
        : ["list", "detail"].includes(handler)
          ? ["OPERATIONS", "ADMINISTRATOR"]
          : ["OPERATIONS"],
  }),
  PublishingSelectionController: () => ({
    publicAccess: false,
    csrfExempt: false,
    roles: ["TERMINAL_CUSTOMER"],
  }),
  HealthController: () => ({ publicAccess: true, csrfExempt: false }),
  FoundationController: () => ({ publicAccess: true, csrfExempt: true }),
  IdentityController: (handler) => ({
    publicAccess: ["requestChallenge", "createSession"].includes(handler),
    csrfExempt: false,
  }),
  AccountGovernanceController: () => ({
    publicAccess: false,
    csrfExempt: false,
    roles: ["ADMINISTRATOR"],
  }),
  BrandController: customerOnly,
  PublishingPackageCustomerController: customerOnly,
  PublishingOrderController: customerOnly,
  CustomerPublicationResultsController: customerOnly,
  CustomerRechargeController: customerOnly,
  AdminRechargeController: () => ({
    publicAccess: false,
    csrfExempt: false,
    roles: ["ADMINISTRATOR"],
  }),
  PublicationWorkController: (handler) => ({
    publicAccess: false,
    csrfExempt: false,
    roles: handler === "act" ? ["OPERATIONS"] : ["OPERATIONS", "ADMINISTRATOR"],
  }),
  PointCustomerController: customerOnly,
  PointAdminController: () => ({
    publicAccess: false,
    csrfExempt: false,
    roles: ["ADMINISTRATOR"],
  }),
  PublishingPackageAdminController: () => ({
    publicAccess: false,
    csrfExempt: false,
    roles: ["ADMINISTRATOR"],
  }),
  BrandReferenceController: customerOnly,
  StoreLocationVerificationController: customerOnly,
  EvaluationController: customerOnly,
  GeoOptimizationController: customerOnly,
  NotificationController: customerOnly,
  MediaAdminController: () => ({
    publicAccess: false,
    csrfExempt: false,
    roles: ["ADMINISTRATOR"],
  }),
  MediaCatalogController: () => ({
    publicAccess: false,
    csrfExempt: false,
    roles: allRoles,
  }),
};

function customerOnly(): Pick<
  RoutePolicy,
  "publicAccess" | "csrfExempt" | "roles"
> {
  return {
    publicAccess: false,
    csrfExempt: false,
    roles: ["TERMINAL_CUSTOMER"],
  };
}

function discoverRoutePolicies(app: INestApplication): RoutePolicy[] {
  const reflector = app.get(Reflector);
  const routes: RoutePolicy[] = [];
  for (const module of app.get(ModulesContainer).values()) {
    for (const wrapper of module.controllers.values()) {
      const controller = wrapper.metatype;
      if (!controller) continue;
      const controllerPath = metadataPath(controller);
      for (const handler of Object.getOwnPropertyNames(controller.prototype)) {
        const method = controller.prototype[handler] as unknown;
        if (typeof method !== "function") continue;
        const requestMethod = Reflect.getMetadata(METHOD_METADATA, method) as
          RequestMethod | undefined;
        if (requestMethod === undefined) continue;
        routes.push({
          controller: controller.name,
          handler,
          method: RequestMethod[requestMethod],
          path: joinRoutePath(controllerPath, metadataPath(method)),
          publicAccess:
            reflector.getAllAndOverride<boolean>(PUBLIC_ACCESS, [
              method,
              controller,
            ]) ?? false,
          csrfExempt:
            reflector.getAllAndOverride<boolean>(CSRF_EXEMPT, [
              method,
              controller,
            ]) ?? false,
          roles: reflector.getAllAndOverride<AccountRole[]>(
            REQUIRED_ACCOUNT_ROLES,
            [method, controller],
          ),
        });
      }
    }
  }
  return routes;
}

function metadataPath(target: object): string {
  const value = Reflect.getMetadata(PATH_METADATA, target) as
    string | string[] | undefined;
  const path = Array.isArray(value) ? value[0] : value;
  return path?.replace(/^\/+|\/+$/g, "") ?? "";
}

function joinRoutePath(controllerPath: string, methodPath: string): string {
  return `/${[controllerPath, methodPath].filter(Boolean).join("/")}`;
}
