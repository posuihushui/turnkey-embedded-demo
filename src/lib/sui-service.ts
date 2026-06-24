import {
  getJsonRpcFullnodeUrl,
  SuiJsonRpcClient,
  type SuiTransactionBlockResponse,
} from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import type { TurnkeySDKClientBase } from "@turnkey/core";
import type { TSignRawPayloadBody } from "@turnkey/sdk-types";
import type { DemoConfig, SuiNetwork } from "./demo-config";
import {
  SUI_COIN_TYPE,
  digestTransactionBytesForTurnkey,
  serializeTurnkeyEd25519Signature,
} from "./sui-demo";

const DEFAULT_GAS_BUDGET_MIST = 10_000_000n;

export type SuiRpcConfig = Pick<DemoConfig, "suiNetwork" | "suiRpcUrl">;

export type BuildSuiTransferBytesParams = {
  client: SuiJsonRpcClient;
  sender: string;
  recipient: string;
  amountMist: bigint;
  gasBudgetMist?: bigint;
};

export type ExecuteTurnkeySuiTransferParams = BuildSuiTransferBytesParams & {
  httpClient: TurnkeySDKClientBase;
  organizationId: string;
  signerPublicKeyHex: string;
};

export type ExecutedSuiTransfer = {
  digest: string;
  signature: string;
  transactionBytes: Uint8Array;
  response: SuiTransactionBlockResponse;
};

export function getSuiRpcUrl(config: SuiRpcConfig): string {
  return config.suiRpcUrl ?? getJsonRpcFullnodeUrl(config.suiNetwork);
}

export function createSuiJsonRpcClient(config: SuiRpcConfig): SuiJsonRpcClient {
  return new SuiJsonRpcClient({
    network: config.suiNetwork as SuiNetwork,
    url: getSuiRpcUrl(config),
  });
}

export function buildTurnkeySuiSigningRequest({
  organizationId,
  signerAddress,
  digestHex,
}: {
  organizationId: string;
  signerAddress: string;
  digestHex: string;
}): TSignRawPayloadBody {
  return {
    timestampMs: Date.now().toString(),
    organizationId,
    signWith: signerAddress,
    payload: digestHex,
    encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
    hashFunction: "HASH_FUNCTION_NOT_APPLICABLE",
  };
}

export async function buildSuiTransferBytes({
  client,
  sender,
  recipient,
  amountMist,
  gasBudgetMist = DEFAULT_GAS_BUDGET_MIST,
}: BuildSuiTransferBytesParams): Promise<Uint8Array> {
  const tx = new Transaction();

  tx.setSender(sender);
  tx.setGasBudget(gasBudgetMist);

  const coin = tx.splitCoins(tx.gas, [amountMist]);
  tx.transferObjects([coin], tx.pure.address(recipient));

  return tx.build({ client });
}

export async function executeTurnkeySuiTransfer({
  client,
  httpClient,
  organizationId,
  sender,
  recipient,
  amountMist,
  signerPublicKeyHex,
  gasBudgetMist,
}: ExecuteTurnkeySuiTransferParams): Promise<ExecutedSuiTransfer> {
  const transactionBytes = await buildSuiTransferBytes({
    client,
    sender,
    recipient,
    amountMist,
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
    requestType: "WaitForEffectsCert",
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

export async function getSuiBalanceMist(
  client: SuiJsonRpcClient,
  owner: string,
): Promise<bigint> {
  const balance = await client.getBalance({
    owner,
    coinType: SUI_COIN_TYPE,
  });

  return BigInt(balance.totalBalance);
}
