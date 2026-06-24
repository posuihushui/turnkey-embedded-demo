export const SUPPORTED_SUI_NETWORKS = ["mainnet", "testnet", "devnet"] as const;

export type SuiNetwork = (typeof SUPPORTED_SUI_NETWORKS)[number];

export type PublicDemoEnv = {
  NEXT_PUBLIC_ORGANIZATION_ID?: string;
  NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID?: string;
  NEXT_PUBLIC_TURNKEY_API_BASE_URL?: string;
  NEXT_PUBLIC_SUI_NETWORK?: string;
  NEXT_PUBLIC_SUI_RPC_URL?: string;
};

export type DemoConfig = {
  organizationId?: string;
  authProxyConfigId?: string;
  turnkeyApiBaseUrl?: string;
  suiNetwork: SuiNetwork;
  suiRpcUrl?: string;
  isTurnkeyConfigured: boolean;
};

export const REQUIRED_TURNKEY_PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_ORGANIZATION_ID",
  "NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID",
] as const;

const clean = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export function isSupportedSuiNetwork(value: string | undefined): value is SuiNetwork {
  return SUPPORTED_SUI_NETWORKS.includes(value as SuiNetwork);
}

export function buildDemoConfig(env: PublicDemoEnv): DemoConfig {
  const organizationId = clean(env.NEXT_PUBLIC_ORGANIZATION_ID);
  const authProxyConfigId = clean(env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID);
  const requestedNetwork = clean(env.NEXT_PUBLIC_SUI_NETWORK);
  const suiNetwork = isSupportedSuiNetwork(requestedNetwork)
    ? requestedNetwork
    : "testnet";

  return {
    organizationId,
    authProxyConfigId,
    turnkeyApiBaseUrl: clean(env.NEXT_PUBLIC_TURNKEY_API_BASE_URL),
    suiNetwork,
    suiRpcUrl: clean(env.NEXT_PUBLIC_SUI_RPC_URL),
    isTurnkeyConfigured: Boolean(organizationId && authProxyConfigId),
  };
}

export function getMissingTurnkeyEnvKeys(config: DemoConfig): string[] {
  return [
    config.organizationId ? undefined : "NEXT_PUBLIC_ORGANIZATION_ID",
    config.authProxyConfigId ? undefined : "NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID",
  ].filter((key): key is string => Boolean(key));
}

export const publicDemoConfig = buildDemoConfig({
  NEXT_PUBLIC_ORGANIZATION_ID: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
  NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID,
  NEXT_PUBLIC_TURNKEY_API_BASE_URL: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL,
  NEXT_PUBLIC_SUI_NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK,
  NEXT_PUBLIC_SUI_RPC_URL: process.env.NEXT_PUBLIC_SUI_RPC_URL,
});
