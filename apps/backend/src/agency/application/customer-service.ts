import { Inject, Injectable } from "@nestjs/common";
import { BrandService } from "../../brand/application/brand.service.js";
import { presentBrand } from "../../brand/application/brand-customer-view.js";
import { EvaluationReportService } from "../../geo-intelligence/application/evaluation-report.service.js";
import { presentReport } from "../../geo-intelligence/application/evaluation-customer-report-view.js";
import { AgencyCustomerIdentityReader } from "../../identity/infrastructure/agency-customer-identity-access.js";
import { PostgresCustomerServiceRepository } from "../infrastructure/postgres-customer-service.repository.js";
import { customerUnavailable } from "../domain/customer-service.js";
@Injectable()
export class AgencyCustomerService {
  constructor(
    @Inject(PostgresCustomerServiceRepository)
    private readonly relations: PostgresCustomerServiceRepository,
    @Inject(AgencyCustomerIdentityReader)
    private readonly identity: AgencyCustomerIdentityReader,
    @Inject(BrandService) private readonly brands: BrandService,
    @Inject(EvaluationReportService)
    private readonly reports: EvaluationReportService,
  ) {}
  async list(agent: string, cursor?: string) {
    const candidates = await this.relations.candidates(agent, cursor);
    const page = candidates.slice(0, 20);
    const contacts = await this.identity.customers(
      page.map((g) => g.accountId),
    );
    const valid = await this.relations.recheck(agent, page);
    return {
      items: page.flatMap((g) => {
        const c = contacts.find((c) => c.id === g.accountId);
        return c && valid.some((v) => v.accountId === g.accountId) ? [c] : [];
      }),
      nextCursor: candidates.length > 20 ? page.at(-1)!.accountId : null,
    };
  }
  private async read<T>(
    agent: string,
    customer: string,
    load: () => Promise<T>,
  ) {
    const grant = await this.relations.grant(agent, customer);
    const [contact] = await this.identity.customers([customer]);
    if (!contact) customerUnavailable();
    const value = await load();
    const active = (await this.identity.customers([customer])).length > 0;
    const [current] = await this.relations.recheck(agent, [grant]);
    if (!current || !active) customerUnavailable();
    return value;
  }
  detail(agent: string, customer: string) {
    return this.read(agent, customer, async () => {
      const [contact] = await this.identity.customers([customer]);
      if (!contact) customerUnavailable();
      return {
        customer: contact,
        brands: (await this.brands.list(customer)).map(presentBrand),
      };
    });
  }
  current(agent: string, customer: string, brand: string) {
    return this.read(agent, customer, async () => {
      const report = await this.reports.current(customer, brand);
      return { report: report ? presentReport(report) : null };
    });
  }
  history(
    agent: string,
    customer: string,
    brand: string,
    limit?: string,
    cursor?: string,
  ) {
    return this.read(agent, customer, () =>
      this.reports.history(customer, brand, limit, cursor),
    );
  }
  report(agent: string, customer: string, brand: string, report: string) {
    return this.read(agent, customer, async () =>
      presentReport(await this.reports.detail(customer, brand, report)),
    );
  }
  async adminState(actor: string, customer: string) {
    const state = await this.relations.adminState(actor, customer);
    const ids = [
      ...(state.agentAccountId ? [state.agentAccountId] : []),
      ...state.events.flatMap((e) => [
        e.actorAccountId,
        ...(e.agentAccountId ? [e.agentAccountId] : []),
        ...(e.beforeAgentAccountId ? [e.beforeAgentAccountId] : []),
      ]),
    ];
    const labels = new Map(
      (await this.identity.labels([...new Set(ids)])).map((a) => [
        a.id,
        a.mobile,
      ]),
    );
    return {
      ...state,
      agentMobile: state.agentAccountId
        ? (labels.get(state.agentAccountId) ?? null)
        : null,
      events: state.events.map((e) => ({
        ...e,
        actorMobile: labels.get(e.actorAccountId) ?? null,
        agentMobile: e.agentAccountId
          ? (labels.get(e.agentAccountId) ?? null)
          : null,
        beforeAgentMobile: e.beforeAgentAccountId
          ? (labels.get(e.beforeAgentAccountId) ?? null)
          : null,
      })),
    };
  }
}
