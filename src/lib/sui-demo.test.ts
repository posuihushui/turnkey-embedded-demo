import { parseSerializedSignature } from "@mysten/sui/cryptography";
import { describe, expect, it } from "vitest";
import {
  SUI_COIN_TYPE,
  SUI_WALLET_ACCOUNT_PARAMS,
  buildSuiExplorerUrl,
  digestTransactionBytesForTurnkey,
  findSuiWalletAccount,
  formatMistToSui,
  parseSuiToMist,
  serializeTurnkeyEd25519Signature,
} from "./sui-demo";

describe("Sui demo helpers", () => {
  it("uses Turnkey's Sui address format and default Sui BIP32 path", () => {
    expect(SUI_COIN_TYPE).toBe("0x2::sui::SUI");
    expect(SUI_WALLET_ACCOUNT_PARAMS).toEqual({
      curve: "CURVE_ED25519",
      pathFormat: "PATH_FORMAT_BIP32",
      path: "m/44'/784'/0'/0'/0'",
      addressFormat: "ADDRESS_FORMAT_SUI",
    });
  });

  it("parses SUI amounts into MIST without floating point math", () => {
    expect(parseSuiToMist("0.001")).toBe(1_000_000n);
    expect(parseSuiToMist("1.23456789")).toBe(1_234_567_890n);
    expect(parseSuiToMist(" 12 ")).toBe(12_000_000_000n);
    expect(() => parseSuiToMist("0.0000000001")).toThrow(
      "SUI supports at most 9 decimal places",
    );
    expect(() => parseSuiToMist("-1")).toThrow("Enter a positive SUI amount");
  });

  it("formats MIST balances as compact SUI strings", () => {
    expect(formatMistToSui(0n)).toBe("0");
    expect(formatMistToSui(1_000_000_000n)).toBe("1");
    expect(formatMistToSui(1_234_567_890n)).toBe("1.23456789");
    expect(formatMistToSui(1_000_000n)).toBe("0.001");
  });

  it("creates the Sui digest Turnkey should sign", () => {
    expect(digestTransactionBytesForTurnkey(new Uint8Array([1, 2, 3]))).toBe(
      "ee461b814937755e5cd5ab7d72d521d48bc4150c1c2c52cca6d5c6666afaec9d",
    );
  });

  it("serializes Turnkey r and s components into a Sui Ed25519 signature", () => {
    const serialized = serializeTurnkeyEd25519Signature({
      r: "11".repeat(32),
      s: "22".repeat(32),
      publicKeyHex: "33".repeat(32),
    });

    const parsed = parseSerializedSignature(serialized);
    expect(parsed.signatureScheme).toBe("ED25519");
    if (parsed.signatureScheme !== "ED25519") {
      throw new Error("Expected ED25519 signature");
    }
    expect(parsed.signature).toEqual(
      Uint8Array.from([...Array(32).fill(0x11), ...Array(32).fill(0x22)]),
    );
    expect(parsed.publicKey).toEqual(Uint8Array.from(Array(32).fill(0x33)));
  });

  it("finds the first Sui account across Turnkey wallets", () => {
    const account = {
      walletAccountId: "wa_sui",
      walletId: "wallet_1",
      organizationId: "org",
      curve: "CURVE_ED25519",
      pathFormat: "PATH_FORMAT_BIP32",
      path: "m/44'/784'/0'/0'/0'",
      addressFormat: "ADDRESS_FORMAT_SUI",
      address: "0xabc",
      createdAt: {},
      updatedAt: {},
      source: "embedded",
    };

    expect(
      findSuiWalletAccount([
        {
          walletId: "wallet_1",
          walletName: "Demo",
          createdAt: {},
          updatedAt: {},
          exported: false,
          imported: false,
          source: "embedded",
          accounts: [
            { ...account, walletAccountId: "wa_eth", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
            account,
          ],
        },
      ]),
    ).toMatchObject({ walletAccountId: "wa_sui" });
  });

  it("builds Sui explorer URLs for addresses and transactions", () => {
    expect(
      buildSuiExplorerUrl({
        type: "address",
        value: "0x123",
        network: "testnet",
      }),
    ).toBe("https://suiexplorer.com/address/0x123?network=testnet");
    expect(
      buildSuiExplorerUrl({
        type: "tx",
        value: "digest",
        network: "mainnet",
      }),
    ).toBe("https://suiexplorer.com/txblock/digest");
  });
});
