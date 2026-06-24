import { describe, expect, it } from "vitest";
import {
  buildTurnkeySuiSigningRequest,
  getSuiRpcUrl,
} from "./sui-service";

describe("Sui service helpers", () => {
  it("uses Mysten JSON-RPC fullnodes unless a custom RPC URL is configured", () => {
    expect(
      getSuiRpcUrl({
        suiNetwork: "testnet",
      }),
    ).toBe("https://fullnode.testnet.sui.io:443");
    expect(
      getSuiRpcUrl({
        suiNetwork: "devnet",
        suiRpcUrl: "https://rpc.example.test",
      }),
    ).toBe("https://rpc.example.test");
  });

  it("builds the Turnkey raw payload request expected by Sui Ed25519 signing", () => {
    expect(
      buildTurnkeySuiSigningRequest({
        organizationId: "org_child",
        signerAddress: "0xabc",
        digestHex: "12".repeat(32),
      }),
    ).toMatchObject({
      organizationId: "org_child",
      signWith: "0xabc",
      payload: "12".repeat(32),
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: "HASH_FUNCTION_NOT_APPLICABLE",
    });
  });
});
