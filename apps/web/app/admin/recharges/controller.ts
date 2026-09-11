import {
  ApiRequestError,
  type AdminRechargeDetail,
  type AdminRechargeFilter,
  type AdminRechargePage,
  type AccountList,
} from "@geoeval/api-client";
import {
  sessionFailureState,
  type RoleSessionState,
} from "../../session-access.js";
export type AdminRechargeState = {
  session: RoleSessionState;
  busy: boolean;
  error: string;
  page: AdminRechargePage | null;
  detail: AdminRechargeDetail | null;
  accounts: AccountList["items"];
};
export type AdminRechargeSource = {
  session(): Promise<RoleSessionState>;
  list(
    actor: string,
    filter: AdminRechargeFilter & { cursor?: string },
    signal: AbortSignal,
  ): Promise<AdminRechargePage>;
  detail(
    actor: string,
    id: string,
    signal: AbortSignal,
  ): Promise<AdminRechargeDetail>;
  accounts(
    actor: string,
    search: string,
    signal: AbortSignal,
  ): Promise<AccountList["items"]>;
};
const empty = (): AdminRechargeState => ({
  session: { kind: "loading" },
  busy: false,
  error: "",
  page: null,
  detail: null,
  accounts: [],
});
/** Owns request lifetimes only. Never infers or changes payment status. */
export class AdminRechargeController {
  state = empty();
  private generation = 0;
  private abort?: AbortController;
  private filter: AdminRechargeFilter = {};
  constructor(
    private readonly source: AdminRechargeSource,
    private readonly changed: (state: AdminRechargeState) => void,
    private readonly orderId?: string,
    private readonly timeoutMs = 15000,
  ) {}
  private publish(patch: Partial<AdminRechargeState>) {
    this.state = { ...this.state, ...patch };
    this.changed(this.state);
  }
  private async run(
    work: (signal: AbortSignal) => Promise<Partial<AdminRechargeState>>,
    reset: Partial<AdminRechargeState> = {},
  ) {
    this.abort?.abort();
    const abort = new AbortController();
    this.abort = abort;
    const generation = ++this.generation;
    this.publish({ ...reset, busy: true, error: "" });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        work(abort.signal),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            abort.abort();
            reject(new Error("READ_TIMEOUT"));
          }, this.timeoutMs);
        }),
      ]);
      if (generation === this.generation) this.publish(result);
    } catch (error) {
      if (generation !== this.generation) return;
      const access = sessionFailureState(error);
      if (
        access ||
        (error instanceof ApiRequestError && [403, 409].includes(error.status))
      ) {
        this.publish({
          ...empty(),
          session: access ?? {
            kind: "error",
            message: "登录账号或权限已变化，请重新核验",
          },
        });
      } else this.publish({ error: "加载失败，请重试" });
    } finally {
      clearTimeout(timer);
      if (generation === this.generation) this.publish({ busy: false });
    }
  }
  bootstrap() {
    return this.run(async (signal) => {
      const session = await this.source.session();
      if (session.kind !== "ready") return { session };
      if (signal.aborted) throw new Error("STALE_SESSION");
      const result = this.orderId
        ? {
            detail: await this.source.detail(
              session.account.id,
              this.orderId,
              signal,
            ),
          }
        : {
            page: await this.source.list(
              session.account.id,
              this.filter,
              signal,
            ),
          };
      return { session, ...result };
    }, empty());
  }
  load(filter: AdminRechargeFilter = this.filter, next = false) {
    if (this.state.session.kind !== "ready") return Promise.resolve();
    const actor = this.state.session.account.id;
    const prior = next ? this.state.page : null;
    if (next && !prior?.nextCursor) return Promise.resolve();
    this.filter = { ...filter };
    return this.run(
      async (signal) => {
        const page = await this.source.list(
          actor,
          {
            ...this.filter,
            ...(next && prior?.nextCursor ? { cursor: prior.nextCursor } : {}),
          },
          signal,
        );
        return {
          page: {
            items: [...(prior?.items ?? []), ...page.items],
            nextCursor: page.nextCursor,
          },
        };
      },
      next ? {} : { page: null },
    );
  }
  searchAccounts(search: string) {
    if (this.state.session.kind !== "ready") return Promise.resolve();
    const actor = this.state.session.account.id;
    return this.run(
      async (signal) => ({
        accounts: await this.source.accounts(actor, search, signal),
      }),
      { accounts: [] },
    );
  }
  refresh() {
    return this.orderId ? this.bootstrap() : this.load();
  }
  destroy() {
    ++this.generation;
    this.abort?.abort();
  }
}
