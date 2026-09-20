import type {
  RechargeApiConfiguration,
  RechargeChannelConfiguration,
  RechargeSingleChannelApiConfiguration,
} from "./recharge-api.module.js";
import type { RechargeWorkerConfiguration } from "./recharge-worker.module.js";
import {
  loadAlipayRechargeApiConfiguration,
  loadAlipayRechargeWorkerConfiguration,
} from "./alipay-recharge.runtime-config.js";
import {
  loadWechatRechargeApiConfiguration,
  loadWechatRechargeWorkerConfiguration,
} from "./wechat-recharge.runtime-config.js";

export { loadRechargeCallbackConfiguration } from "./recharge-callback.runtime-config.js";

function channel(
  value: RechargeSingleChannelApiConfiguration,
): RechargeChannelConfiguration {
  return {
    recharge: value.recharge,
    preparation: value.preparation,
    channel: value.channel,
    recovery: value.recovery,
    verifier: value.verifier,
    ...(value.clock ? { clock: value.clock } : {}),
  };
}

export function loadRechargeApiConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): RechargeApiConfiguration | null {
  const configured = [
    loadAlipayRechargeApiConfiguration(environment),
    loadWechatRechargeApiConfiguration(environment),
  ].filter(
    (value): value is RechargeSingleChannelApiConfiguration => value !== null,
  );
  if (configured.length < 1) return null;
  const first = configured[0]!;
  return {
    channels: configured.map(channel),
    controlled: configured.some((value) => value.controlled),
    shortcutAmounts: first.shortcutAmounts,
    supportMessage: first.supportMessage,
  };
}

export function loadRechargeWorkerConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): RechargeWorkerConfiguration | null {
  const configured = [
    loadAlipayRechargeWorkerConfiguration(environment),
    loadWechatRechargeWorkerConfiguration(environment),
  ].filter((value): value is RechargeWorkerConfiguration => value !== null);
  if (configured.length < 1) return null;
  const first = configured[0]!;
  for (const value of configured.slice(1)) {
    if (
      value.databaseUrl !== first.databaseUrl ||
      value.runtimeEnvironment !== first.runtimeEnvironment ||
      JSON.stringify(value.scheduling) !== JSON.stringify(first.scheduling) ||
      JSON.stringify(value.notifications) !==
        JSON.stringify(first.notifications)
    )
      throw new Error("RECHARGE_HOST_CONFIGURATION_MISMATCH");
  }
  return {
    databaseUrl: first.databaseUrl,
    runtimeEnvironment: first.runtimeEnvironment,
    controlled: configured.some((value) => value.controlled),
    channels: configured.flatMap((value) =>
      "channels" in value ? value.channels : [value.native],
    ),
    scheduling: first.scheduling,
    ...(first.notifications ? { notifications: first.notifications } : {}),
  };
}
