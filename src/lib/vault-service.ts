import type { SuiJsonRpcClient, SuiTransactionBlockResponse } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import type { TurnkeySDKClientBase } from "@turnkey/core";
import {
  digestTransactionBytesForTurnkey,
  serializeTurnkeyEd25519Signature,
} from "./sui-demo";
import { buildTurnkeySuiSigningRequest } from "./sui-service";
import {
  CLOCK_OBJECT_ID,
  USDC_DECIMALS,
  type VaultContracts,
  getVaultFunction,
} from "./vault-contracts";

const DEFAULT_VAULT_GAS_BUDGET_MIST = 20_000_000n;
const USDC_BASE = 10n ** BigInt(USDC_DECIMALS);

export type BuildVaultDepositTransactionParams = {
  sender: string;
  amountBaseUnits: bigint;
  contracts: VaultContracts;
  gasBudgetMist?: bigint;
};

export type BuildVaultDepositBytesParams = BuildVaultDepositTransactionParams & {
  client: SuiJsonRpcClient;
};

export type ExecuteTurnkeyVaultDepositParams = BuildVaultDepositBytesParams & {
  httpClient: TurnkeySDKClientBase;
  organizationId: string;
  signerPublicKeyHex: string;
};

export type ExecutedVaultDeposit = {
  digest: string;
  signature: string;
  transactionBytes: Uint8Array;
  response: SuiTransactionBlockResponse;
};

export type VaultDepositStatus = {
  depositEnabled: boolean;
  settlementActive: boolean;
};

type SuiObjectReader = Pick<SuiJsonRpcClient, "getObject">;

type MoveObjectContent = {
  dataType?: string;
  fields?: Record<string, unknown>;
};

export function parseUsdcToBaseUnits(value: string): bigint {
  const trimmed = value.trim();

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter a positive USDC amount");
  }

  const [wholePart, fractionalPart = ""] = trimmed.split(".");
  if (fractionalPart.length > USDC_DECIMALS) {
    throw new Error("USDC supports at most 6 decimal places");
  }

  const wholeUnits = BigInt(wholePart) * USDC_BASE;
  const fractionalUnits = BigInt(fractionalPart.padEnd(USDC_DECIMALS, "0") || "0");
  const amount = wholeUnits + fractionalUnits;

  if (amount <= 0n) {
    throw new Error("Enter a positive USDC amount");
  }

  return amount;
}

export function formatUsdcBaseUnits(value: bigint | string | number): string {
  const amount = BigInt(value);
  if (amount < 0n) {
    throw new Error("USDC amount cannot be negative");
  }

  const whole = amount / USDC_BASE;
  const fractional = amount % USDC_BASE;
  const fractionalText = fractional
    .toString()
    .padStart(USDC_DECIMALS, "0")
    .replace(/0+$/, "");

  return fractionalText ? `${whole}.${fractionalText}` : whole.toString();
}

export function buildVaultDepositTransaction({
  sender,
  amountBaseUnits,
  contracts,
  gasBudgetMist = DEFAULT_VAULT_GAS_BUDGET_MIST,
}: BuildVaultDepositTransactionParams): Transaction {
  if (amountBaseUnits <= 0n) {
    throw new Error("Enter a positive USDC amount");
  }

  const tx = new Transaction();
  tx.setSender(sender);
  tx.setGasBudget(gasBudgetMist);

  const depositCoin = tx.coin({
    balance: amountBaseUnits,
    type: contracts.USDC_TYPE,
  });

  tx.moveCall({
    target: getVaultFunction(contracts, "deposit"),
    typeArguments: [contracts.USDC_TYPE, contracts.RCUSDP_TYPE],
    arguments: [
      tx.object(contracts.VAULT_OBJECT_ID),
      tx.object(contracts.VAULT_TYPE_CONFIG_ID),
      tx.object(contracts.PENDING_DEPOSITS_ID),
      tx.object(contracts.USER_RECORD_ID),
      tx.object(contracts.DEPOSIT_SETTLEMENT_STATE_ID),
      depositCoin,
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export async function buildVaultDepositBytes({
  client,
  ...params
}: BuildVaultDepositBytesParams): Promise<Uint8Array> {
  return buildVaultDepositTransaction(params).build({ client });
}

export async function executeTurnkeyVaultDeposit({
  client,
  httpClient,
  organizationId,
  sender,
  amountBaseUnits,
  signerPublicKeyHex,
  contracts,
  gasBudgetMist,
}: ExecuteTurnkeyVaultDepositParams): Promise<ExecutedVaultDeposit> {
  const transactionBytes = await buildVaultDepositBytes({
    client,
    sender,
    amountBaseUnits,
    contracts,
    gasBudgetMist,
  });
  const digestHex = digestTransactionBytesForTurnkey(transactionBytes);
  const signatureParts = await httpClient.signRawPayload(
    buildTurnkeySuiSigningRequest({
      organizationId,
      signerAddress: sender,
      digestHex,
    }),
  );
  const signature = serializeTurnkeyEd25519Signature({
    r: signatureParts.r,
    s: signatureParts.s,
    publicKeyHex: signerPublicKeyHex,
  });
  const response = await client.executeTransactionBlock({
    transactionBlock: transactionBytes,
    signature,
    options: {
      showBalanceChanges: true,
      showEffects: true,
      showObjectChanges: true,
    },
  });

  return {
    digest: response.digest,
    signature,
    transactionBytes,
    response,
  };
}

export async function getVaultUsdcBalanceBaseUnits(
  client: SuiJsonRpcClient,
  owner: string,
  contracts: Pick<VaultContracts, "USDC_TYPE">,
): Promise<bigint> {
  const balance = await client.getBalance({
    owner,
    coinType: contracts.USDC_TYPE,
  });

  return BigInt(balance.totalBalance);
}

export async function getVaultDepositStatus(
  client: SuiObjectReader,
  contracts: Pick<VaultContracts, "DEPOSIT_SETTLEMENT_STATE_ID">,
): Promise<VaultDepositStatus> {
  const depositState = await client.getObject({
    id: contracts.DEPOSIT_SETTLEMENT_STATE_ID,
    options: { showContent: true },
  });
  const content = depositState.data?.content as MoveObjectContent | undefined;
  const settlementActive =
    content?.dataType === "moveObject" && content.fields?.active === true;

  return {
    depositEnabled: !settlementActive,
    settlementActive,
  };
}
