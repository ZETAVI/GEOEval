import type {
  AccountView,
  AuthenticatedPrincipal,
} from "../domain/identity.types.js";

export type IdentityHttpRequest = {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  geoevalPrincipal?: AuthenticatedPrincipal;
  geoevalAccount?: AccountView;
};

export type HeaderWriter = {
  setHeader(name: string, value: string): void;
};
