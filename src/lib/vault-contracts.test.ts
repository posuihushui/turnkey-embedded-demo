import { describe, expect, it } from "vitest";
import {
  TESTNET_VAULT_CONTRACTS,
  USDC_DECIMALS,
  getVaultContracts,
  getVaultFunction,
  isVaultNetwork,
} from "./vault-contracts";

describe("vault contract config", () => {
  it("uses the testnet vault contracts from the reference frontend", () => {
    expect(TESTNET_VAULT_CONTRACTS).toMatchObject({
      PACKAGE_ID:
        "0xcf7293eba9307057793d0685e4c573b12a2c2928ab60028f1d8766f1d4879c1c",
      USDC_TYPE:
        "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
      RCUSDP_TYPE:
        "0xebe1dce0342ac1c5d2cee823c5d9af6ea34ccca51cc95ecafcfe7b1a0dc64947::rcusdp::RCUSDP",
      VAULT_OBJECT_ID:
        "0x8a4af424533e98ce4ca52449acc5721233a81a99665add2b839bd60e1632f4e7",
      PENDING_DEPOSITS_ID:
        "0x888f69e588e7426283d9a2dfac2ffac4233efce1fb05ced22cfa58cac375eabb",
      USER_RECORD_ID:
        "0xabeeefe767c3b89bc9eeb84ec52462f0b293b12976ceba004921261c6b646e75",
      VAULT_TYPE_CONFIG_ID:
        "0x7982d6610aa9e024c442d7b947e399e2cf1cbdcb99aa6eb9eb65f6e6cb71701c",
      DEPOSIT_SETTLEMENT_STATE_ID:
        "0x1fd6cbbaca9c366a81d25432e13320fbf48db50b86e03e4e9798f1ebc843243f",
    });
    expect(USDC_DECIMALS).toBe(6);
  });

  it("enables vault operations only on the configured vault network", () => {
    expect(isVaultNetwork("testnet")).toBe(true);
    expect(isVaultNetwork("devnet")).toBe(false);
    expect(getVaultContracts("testnet")).toBe(TESTNET_VAULT_CONTRACTS);
    expect(getVaultContracts("devnet")).toBeUndefined();
  });

  it("builds vault_api function targets from the active package id", () => {
    expect(getVaultFunction(TESTNET_VAULT_CONTRACTS, "deposit")).toBe(
      `${TESTNET_VAULT_CONTRACTS.PACKAGE_ID}::vault_api::deposit`,
    );
  });
});
