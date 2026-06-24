import { describe, expect, it } from "vitest";
import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { TESTNET_VAULT_CONTRACTS } from "./vault-contracts";
import {
  buildVaultDepositTransaction,
  formatUsdcBaseUnits,
  getVaultDepositStatus,
  parseUsdcToBaseUnits,
} from "./vault-service";

const sender =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

describe("vault service helpers", () => {
  it("parses USDC amounts into six-decimal base units", () => {
    expect(parseUsdcToBaseUnits("1")).toBe(1_000_000n);
    expect(parseUsdcToBaseUnits("0.01")).toBe(10_000n);
    expect(parseUsdcToBaseUnits("12.345678")).toBe(12_345_678n);
    expect(parseUsdcToBaseUnits(" 2.5 ")).toBe(2_500_000n);
    expect(() => parseUsdcToBaseUnits("0.0000001")).toThrow(
      "USDC supports at most 6 decimal places",
    );
    expect(() => parseUsdcToBaseUnits("0")).toThrow("Enter a positive USDC amount");
  });

  it("formats USDC base units without rounding up", () => {
    expect(formatUsdcBaseUnits(0n)).toBe("0");
    expect(formatUsdcBaseUnits(1_000_000n)).toBe("1");
    expect(formatUsdcBaseUnits(12_345_678n)).toBe("12.345678");
    expect(formatUsdcBaseUnits(10_000n)).toBe("0.01");
  });

  it("builds a testnet vault_api deposit transaction", () => {
    const tx = buildVaultDepositTransaction({
      sender,
      amountBaseUnits: 1_000_000n,
      contracts: TESTNET_VAULT_CONTRACTS,
    });
    const data = tx.getData() as {
      sender: string;
      commands: Array<{
        $Intent?: { name: string; data: Record<string, unknown> };
        MoveCall?: {
          package: string;
          module: string;
          function: string;
          typeArguments: string[];
          arguments: unknown[];
        };
      }>;
    };

    expect(data.sender).toBe(sender);
    expect(data.commands[0].$Intent).toMatchObject({
      name: "CoinWithBalance",
      data: {
        type: TESTNET_VAULT_CONTRACTS.USDC_TYPE,
        balance: 1_000_000n,
        outputKind: "coin",
      },
    });
    expect(data.commands[1].MoveCall).toMatchObject({
      package: TESTNET_VAULT_CONTRACTS.PACKAGE_ID,
      module: "vault_api",
      function: "deposit",
      typeArguments: [
        TESTNET_VAULT_CONTRACTS.USDC_TYPE,
        TESTNET_VAULT_CONTRACTS.RCUSDP_TYPE,
      ],
    });
    expect(data.commands[1].MoveCall?.arguments).toHaveLength(7);
  });

  it("reports deposits disabled while settlement state is active", async () => {
    const client = {
      getObject: async () => ({
        data: {
          objectId: TESTNET_VAULT_CONTRACTS.DEPOSIT_SETTLEMENT_STATE_ID,
          version: "1",
          digest: "mock-digest",
          content: {
            dataType: "moveObject",
            type: "mock::vault::DepositSettlementState",
            hasPublicTransfer: false,
            fields: {
              active: true,
            },
          },
        },
      }),
    } satisfies Pick<SuiJsonRpcClient, "getObject">;

    await expect(
      getVaultDepositStatus(client, TESTNET_VAULT_CONTRACTS),
    ).resolves.toEqual({
      depositEnabled: false,
      settlementActive: true,
    });
  });
});
