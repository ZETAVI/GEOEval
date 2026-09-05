# NestJS and Prisma access-boundary source brief

- Status: Current primary-source check for bounded implementation
- Accessed: 2026-09-04
- Owning Change: `establish-identity-access-governance`

## Question

Can the approved fail-closed access boundary and serialized administrator
governance transaction be implemented with the repository's current NestJS 11
and Prisma 7 dependencies, without adding an authorization framework or a new
lock service?

## Primary sources

1. NestJS, [Guards](https://docs.nestjs.com/guards): application-scoped guards
   may be registered with `APP_GUARD`, keep dependency injection, and execute
   before controller or route guards.
2. NestJS, [Authorization](https://docs.nestjs.com/security/authorization):
   route or controller metadata can declare required roles and `Reflector`
   resolves that metadata in a guard.
3. Prisma, [Transactions and batch queries](https://www.prisma.io/docs/orm/prisma-client/queries/transactions):
   interactive transactions accept an isolation level and bounded wait/timeout
   options; PostgreSQL supports `Serializable` through Prisma.

## Decision impact

- Adopt one dependency-injected `APP_GUARD` for Session authentication and
  fixed-role enforcement, plus explicit public metadata. Do not add a generic
  RBAC package.
- Keep the PostgreSQL governance-control row as the serialization point and run
  governance writes in Prisma interactive transactions with `Serializable`
  isolation. Do not add Redis or a process-local mutex as authorization truth.
- Add no dependency and make the route inventory plus concurrency integration
  test the discriminating evidence. Runtime behavior remains authoritative if
  the library documentation and actual adapter diverge.

## Residual uncertainty

Prisma's transaction abstraction does not prove the last-administrator
invariant by itself. The implementation must still lock the deterministic
control row, re-read actor and target inside the transaction, and exercise two
competing governance writes against PostgreSQL.
