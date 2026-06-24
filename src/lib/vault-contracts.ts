import type { SuiNetwork } from "./demo-config";

export type VaultContracts = {
  PACKAGE_ID: string;
  USDC_TYPE: string;
  RCUSDP_TYPE: string;
  VAULT_OBJECT_ID: string;
  PENDING_DEPOSITS_ID: string;
  PENDING_REDEEMS_ID: string;
  BALANCES_ID: string;
  CLAIMS_ID: string;
  USER_RECORD_ID: string;
  VAULT_TYPE_CONFIG_ID: string;
  DEPOSIT_SETTLEMENT_STATE_ID: string;
};

export const VAULT_MODULE = "vault";
export const VAULT_API_MODULE = "vault_api";
export const CLOCK_OBJECT_ID = "0x6";
export const USDC_DECIMALS = 6;

export const TESTNET_VAULT_CONTRACTS = {
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
  PENDING_REDEEMS_ID:
    "0x3dc596f41ac76dd680ebfff6a8f9a2601672a008234ef5e68cfe24d16cbfb147",
  BALANCES_ID:
    "0xe157231444fd978a6e1e6f567eed9d643b803d59b5debbccb51d28e3f7ea4f6a",
  CLAIMS_ID:
    "0xe10230a23c1c0a76eb980840c983d3ac1a624373000a1517ff37b52dd890ebe7",
  USER_RECORD_ID:
    "0xabeeefe767c3b89bc9eeb84ec52462f0b293b12976ceba004921261c6b646e75",
  VAULT_TYPE_CONFIG_ID:
    "0x7982d6610aa9e024c442d7b947e399e2cf1cbdcb99aa6eb9eb65f6e6cb71701c",
  DEPOSIT_SETTLEMENT_STATE_ID:
    "0x1fd6cbbaca9c366a81d25432e13320fbf48db50b86e03e4e9798f1ebc843243f",
} satisfies VaultContracts;

export type VaultNetwork = "testnet";

export function isVaultNetwork(network: SuiNetwork): network is VaultNetwork {
  return network === "testnet";
}

export function getVaultContracts(network: SuiNetwork): VaultContracts | undefined {
  return isVaultNetwork(network) ? TESTNET_VAULT_CONTRACTS : undefined;
}

export function getVaultFunction(
  contracts: Pick<VaultContracts, "PACKAGE_ID">,
  functionName: string,
): string {
  return `${contracts.PACKAGE_ID}::${VAULT_API_MODULE}::${functionName}`;
}
