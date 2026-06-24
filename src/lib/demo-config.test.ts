import { describe, expect, it } from "vitest";
import {
  buildDemoConfig,
  getMissingTurnkeyEnvKeys,
  isSupportedSuiNetwork,
} from "./demo-config";

describe("demo config", () => {
  it("reports missing public Turnkey env vars", () => {
    const config = buildDemoConfig({});

    expect(getMissingTurnkeyEnvKeys(config)).toEqual([
      "NEXT_PUBLIC_ORGANIZATION_ID",
      "NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID",
    ]);
    expect(config.isTurnkeyConfigured).toBe(false);
    expect(config.suiNetwork).toBe("testnet");
  });

  it("accepts configured Turnkey vars and a supported Sui network", () => {
    const config = buildDemoConfig({
      NEXT_PUBLIC_ORGANIZATION_ID: "org_123",
      NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID: "auth_proxy_123",
      NEXT_PUBLIC_SUI_NETWORK: "devnet",
      NEXT_PUBLIC_SUI_RPC_URL: "https://example.test/rpc",
    });

    expect(config.isTurnkeyConfigured).toBe(true);
    expect(config.suiNetwork).toBe("devnet");
    expect(config.suiRpcUrl).toBe("https://example.test/rpc");
  });

  it("falls back to testnet for unsupported network names", () => {
    expect(isSupportedSuiNetwork("mainnet")).toBe(true);
    expect(isSupportedSuiNetwork("unknown")).toBe(false);
    expect(buildDemoConfig({ NEXT_PUBLIC_SUI_NETWORK: "unknown" }).suiNetwork).toBe(
      "testnet",
    );
  });
});
