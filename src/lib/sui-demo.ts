import { messageWithIntent, toSerializedSignature } from "@mysten/sui/cryptography";
import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { fromHex, toHex } from "@mysten/sui/utils";
import type { v1WalletAccount, v1WalletAccountParams } from "@turnkey/sdk-types";
import { blake2b } from "@noble/hashes/blake2.js";
import type { SuiNetwork } from "./demo-config";

export const SUI_COIN_TYPE = "0x2::sui::SUI";
export const MIST_PER_SUI = 1_000_000_000n;

export const SUI_WALLET_ACCOUNT_PARAMS = {
  curve: "CURVE_ED25519",
  pathFormat: "PATH_FORMAT_BIP32",
  path: "m/44'/784'/0'/0'/0'",
  addressFormat: "ADDRESS_FORMAT_SUI",
} satisfies v1WalletAccountParams;

export type SuiWalletAccount = v1WalletAccount & {
  publicKey?: string;
};

type WalletAccountCandidate = {
  addressFormat?: string;
};

export type WalletAccountList = {
  accounts: WalletAccountCandidate[];
};

export type ExplorerLinkInput = {
  type: "address" | "tx";
  value: string;
  network: SuiNetwork;
};

export type TurnkeyEd25519SignatureParts = {
  r: string;
  s: string;
  publicKeyHex: string;
};

function stripHexPrefix(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value;
}

export function parseSuiToMist(value: string): bigint {
  const trimmed = value.trim();

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter a positive SUI amount");
  }

  const [wholePart, fractionalPart = ""] = trimmed.split(".");
  if (fractionalPart.length > 9) {
    throw new Error("SUI supports at most 9 decimal places");
  }

  const wholeMist = BigInt(wholePart) * MIST_PER_SUI;
  const fractionalMist = BigInt(fractionalPart.padEnd(9, "0") || "0");
  const amount = wholeMist + fractionalMist;

  if (amount <= 0n) {
    throw new Error("Enter a positive SUI amount");
  }

  return amount;
}

export function formatMistToSui(value: bigint | string | number): string {
  const mist = BigInt(value);
  if (mist < 0n) {
    throw new Error("MIST balance cannot be negative");
  }

  const whole = mist / MIST_PER_SUI;
  const fractional = mist % MIST_PER_SUI;
  const fractionalText = fractional.toString().padStart(9, "0").replace(/0+$/, "");

  return fractionalText ? `${whole}.${fractionalText}` : whole.toString();
}

export function digestTransactionBytesForTurnkey(transactionBytes: Uint8Array): string {
  const intentMessage = messageWithIntent("TransactionData", transactionBytes);
  return toHex(blake2b(intentMessage, { dkLen: 32 }));
}

export function serializeTurnkeyEd25519Signature({
  r,
  s,
  publicKeyHex,
}: TurnkeyEd25519SignatureParts): string {
  const signature = fromHex(`${stripHexPrefix(r)}${stripHexPrefix(s)}`);
  const publicKey = new Ed25519PublicKey(fromHex(stripHexPrefix(publicKeyHex)));

  return toSerializedSignature({
    signatureScheme: "ED25519",
    signature,
    publicKey,
  });
}

export function findSuiWalletAccount<T extends WalletAccountList>(
  wallets: T[],
): SuiWalletAccount | undefined {
  return wallets
    .flatMap((wallet) => wallet.accounts)
    .find((account) => account.addressFormat === "ADDRESS_FORMAT_SUI") as
    | SuiWalletAccount
    | undefined;
}

export function buildSuiExplorerUrl({ type, value, network }: ExplorerLinkInput): string {
  const path = type === "address" ? "address" : "txblock";
  const url = new URL(`https://suiexplorer.com/${path}/${value}`);

  if (network !== "mainnet") {
    url.searchParams.set("network", network);
  }

  return url.toString();
}
