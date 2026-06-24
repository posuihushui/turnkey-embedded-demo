"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  LogOut,
  Network,
  RefreshCw,
  Send,
  ShieldCheck,
  Vault,
  Wallet,
} from "lucide-react";
import {
  AuthState,
  ClientState,
  useTurnkey,
} from "@turnkey/react-wallet-kit";
import { isValidSuiAddress } from "@mysten/sui/utils";
import type { DemoConfig } from "@/lib/demo-config";
import {
  SUI_WALLET_ACCOUNT_PARAMS,
  buildSuiExplorerUrl,
  findSuiWalletAccount,
  formatMistToSui,
  parseSuiToMist,
} from "@/lib/sui-demo";
import {
  createSuiJsonRpcClient,
  executeTurnkeySuiTransfer,
  getSuiBalanceMist,
  getSuiRpcUrl,
} from "@/lib/sui-service";
import { getVaultContracts } from "@/lib/vault-contracts";
import {
  executeTurnkeyVaultDeposit,
  formatUsdcBaseUnits,
  getVaultDepositStatus,
  getVaultUsdcBalanceBaseUnits,
  parseUsdcToBaseUnits,
} from "@/lib/vault-service";

type BusyAction =
  | "login"
  | "create-wallet"
  | "refresh"
  | "refresh-usdc"
  | "send"
  | "vault-deposit"
  | "logout"
  | null;

type LogEntry = {
  id: number;
  title: string;
  detail: string;
  tone: "info" | "success" | "error";
};

const initialLog: LogEntry[] = [
  {
    id: 1,
    title: "Ready",
    detail: "Turnkey provider loaded. Sign in to create or fetch a Sui wallet.",
    tone: "success",
  },
];

export function TurnkeyWalletDemo({ config }: { config: DemoConfig }) {
  const turnkey = useTurnkey();
  const {
    authState,
    clientState,
    createWallet,
    createWalletAccounts,
    handleLogin,
    httpClient,
    logout,
    refreshWallets,
    session,
    user,
    wallets,
  } = turnkey;

  const suiClient = useMemo(() => createSuiJsonRpcClient(config), [config]);
  const suiAccount = useMemo(() => findSuiWalletAccount(wallets), [wallets]);
  const vaultContracts = useMemo(
    () => getVaultContracts(config.suiNetwork),
    [config.suiNetwork],
  );
  const isAuthenticated = authState === AuthState.Authenticated;
  const isClientReady = clientState === ClientState.Ready;

  const [amount, setAmount] = useState("0.001");
  const [vaultAmount, setVaultAmount] = useState("1");
  const [recipient, setRecipient] = useState("");
  const [balanceMist, setBalanceMist] = useState<bigint | null>(null);
  const [usdcBalanceBaseUnits, setUsdcBalanceBaseUnits] = useState<bigint | null>(null);
  const [vaultSettlementActive, setVaultSettlementActive] = useState<boolean | null>(
    null,
  );
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [lastDigest, setLastDigest] = useState<string | null>(null);
  const [lastVaultDigest, setLastVaultDigest] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>(initialLog);

  const addLog = useCallback((entry: Omit<LogEntry, "id">) => {
    setLogs((current) => [
      { ...entry, id: Date.now() },
      ...current.slice(0, 5),
    ]);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!suiAccount) {
      return;
    }

    setBusyAction("refresh");
    try {
      const nextBalance = await getSuiBalanceMist(suiClient, suiAccount.address);
      setBalanceMist(nextBalance);
      addLog({
        title: "Balance refreshed",
        detail: `${formatMistToSui(nextBalance)} SUI on ${config.suiNetwork}.`,
        tone: "success",
      });
    } catch (error) {
      addLog({
        title: "Balance error",
        detail: getErrorMessage(error),
        tone: "error",
      });
    } finally {
      setBusyAction(null);
    }
  }, [addLog, config.suiNetwork, suiAccount, suiClient]);

  const loadVaultUsdcBalance = useCallback(async () => {
    if (!suiAccount || !vaultContracts) {
      return null;
    }

    const nextBalance = await getVaultUsdcBalanceBaseUnits(
      suiClient,
      suiAccount.address,
      vaultContracts,
    );
    setUsdcBalanceBaseUnits(nextBalance);
    return nextBalance;
  }, [suiAccount, suiClient, vaultContracts]);

  const loadVaultDepositStatus = useCallback(async () => {
    if (!vaultContracts) {
      return null;
    }

    const status = await getVaultDepositStatus(suiClient, vaultContracts);
    setVaultSettlementActive(status.settlementActive);
    return status;
  }, [suiClient, vaultContracts]);

  useEffect(() => {
    if (!vaultContracts) {
      return;
    }

    let cancelled = false;

    getVaultDepositStatus(suiClient, vaultContracts)
      .then((status) => {
        if (!cancelled) {
          setVaultSettlementActive(status.settlementActive);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVaultSettlementActive(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [suiClient, vaultContracts]);

  const refreshVaultUsdcBalance = useCallback(async () => {
    if (!suiAccount || !vaultContracts) {
      return;
    }

    setBusyAction("refresh-usdc");
    try {
      const [nextBalance, status] = await Promise.all([
        loadVaultUsdcBalance(),
        loadVaultDepositStatus(),
      ]);
      if (nextBalance === null) {
        return;
      }
      addLog({
        title: "USDC refreshed",
        detail: `${formatUsdcBaseUnits(nextBalance)} USDC on ${
          config.suiNetwork
        }. ${status?.settlementActive ? "Deposit settlement is active." : "Deposits are open."}`,
        tone: "success",
      });
    } catch (error) {
      addLog({
        title: "USDC balance error",
        detail: getErrorMessage(error),
        tone: "error",
      });
    } finally {
      setBusyAction(null);
    }
  }, [
    addLog,
    config.suiNetwork,
    loadVaultDepositStatus,
    loadVaultUsdcBalance,
    suiAccount,
    vaultContracts,
  ]);

  const login = async () => {
    setBusyAction("login");
    try {
      await handleLogin({ title: "Turnkey Sui Wallet" });
      addLog({
        title: "Authentication complete",
        detail: "Turnkey session is active.",
        tone: "success",
      });
    } catch (error) {
      addLog({
        title: "Authentication error",
        detail: getErrorMessage(error),
        tone: "error",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const logoutUser = async () => {
    setBusyAction("logout");
    try {
      await logout();
      setBalanceMist(null);
      setUsdcBalanceBaseUnits(null);
      setVaultSettlementActive(null);
      setLastDigest(null);
      setLastVaultDigest(null);
      addLog({
        title: "Signed out",
        detail: "Local Turnkey session was cleared.",
        tone: "info",
      });
    } catch (error) {
      addLog({
        title: "Logout error",
        detail: getErrorMessage(error),
        tone: "error",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const createSuiWallet = async () => {
    if (!isAuthenticated) {
      await login();
      return;
    }

    if (suiAccount) {
      addLog({
        title: "Sui wallet exists",
        detail: "Using the existing ADDRESS_FORMAT_SUI account.",
        tone: "info",
      });
      return;
    }

    setBusyAction("create-wallet");
    try {
      if (wallets.length === 0) {
        await createWallet({
          walletName: "Turnkey Sui Demo",
          accounts: [SUI_WALLET_ACCOUNT_PARAMS],
        });
      } else {
        await createWalletAccounts({
          walletId: wallets[0].walletId,
          accounts: [SUI_WALLET_ACCOUNT_PARAMS],
        });
      }

      await refreshWallets();
      addLog({
        title: "Sui wallet ready",
        detail: "Created an Ed25519 Sui account with ADDRESS_FORMAT_SUI.",
        tone: "success",
      });
    } catch (error) {
      addLog({
        title: "Wallet creation error",
        detail: getErrorMessage(error),
        tone: "error",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const getSignerPublicKey = async () => {
    if (!suiAccount) {
      throw new Error("Create a Sui wallet before signing.");
    }

    if (suiAccount.publicKey) {
      return suiAccount.publicKey;
    }

    if (!httpClient) {
      throw new Error("Turnkey client is not ready.");
    }

    const response = await httpClient.getWalletAccount({
      organizationId: session?.organizationId,
      walletId: suiAccount.walletId,
      address: suiAccount.address,
    });
    if (!response.account.publicKey) {
      throw new Error("Turnkey did not return a public key for this Sui account.");
    }

    return response.account.publicKey;
  };

  const sendTransfer = async () => {
    if (!suiAccount || !httpClient || !session?.organizationId) {
      addLog({
        title: "Wallet not ready",
        detail: "Sign in and create a Sui wallet before sending.",
        tone: "error",
      });
      return;
    }

    const recipientAddress = recipient.trim() || suiAccount.address;

    if (!isValidSuiAddress(recipientAddress)) {
      addLog({
        title: "Invalid recipient",
        detail: "Recipient must be a valid Sui address.",
        tone: "error",
      });
      return;
    }

    setBusyAction("send");
    try {
      const amountMist = parseSuiToMist(amount);
      const signerPublicKeyHex = await getSignerPublicKey();
      addLog({
        title: "Signing requested",
        detail: `Building ${amount} SUI transfer for Turnkey raw payload signing.`,
        tone: "info",
      });
      const result = await executeTurnkeySuiTransfer({
        client: suiClient,
        httpClient,
        organizationId: session.organizationId,
        sender: suiAccount.address,
        recipient: recipientAddress,
        amountMist,
        signerPublicKeyHex,
      });

      setLastDigest(result.digest);
      addLog({
        title: "Transaction submitted",
        detail: result.digest,
        tone: "success",
      });
      await refreshBalance();
    } catch (error) {
      addLog({
        title: "Transfer error",
        detail: getErrorMessage(error),
        tone: "error",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const depositToVault = async () => {
    if (!suiAccount || !httpClient || !session?.organizationId || !vaultContracts) {
      addLog({
        title: "Vault not ready",
        detail: "Sign in with a Sui wallet on testnet before depositing.",
        tone: "error",
      });
      return;
    }

    setBusyAction("vault-deposit");
    try {
      const amountBaseUnits = parseUsdcToBaseUnits(vaultAmount);
      const [currentUsdcBalance, depositStatus] = await Promise.all([
        loadVaultUsdcBalance(),
        loadVaultDepositStatus(),
      ]);

      if (depositStatus?.settlementActive) {
        throw new Error(
          "Deposit settlement is active on the vault. Try again after the operator completes settlement.",
        );
      }

      if (currentUsdcBalance !== null && currentUsdcBalance < amountBaseUnits) {
        throw new Error(
          `Insufficient USDC balance. Have ${formatUsdcBaseUnits(
            currentUsdcBalance,
          )}, need ${formatUsdcBaseUnits(amountBaseUnits)}`,
        );
      }

      const signerPublicKeyHex = await getSignerPublicKey();
      addLog({
        title: "Vault signing requested",
        detail: `Building ${formatUsdcBaseUnits(amountBaseUnits)} USDC deposit.`,
        tone: "info",
      });

      const result = await executeTurnkeyVaultDeposit({
        client: suiClient,
        httpClient,
        organizationId: session.organizationId,
        sender: suiAccount.address,
        amountBaseUnits,
        signerPublicKeyHex,
        contracts: vaultContracts,
      });

      setLastDigest(result.digest);
      setLastVaultDigest(result.digest);
      addLog({
        title: "Vault deposit submitted",
        detail: result.digest,
        tone: "success",
      });
      await loadVaultUsdcBalance();
      await loadVaultDepositStatus();
    } catch (error) {
      addLog({
        title: "Vault deposit error",
        detail: getErrorMessage(error),
        tone: "error",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const copyAddress = async () => {
    if (!suiAccount?.address) {
      return;
    }

    await navigator.clipboard.writeText(suiAccount.address);
    addLog({
      title: "Address copied",
      detail: "Sui address copied to clipboard.",
      tone: "success",
    });
  };

  const addressUrl = suiAccount
    ? buildSuiExplorerUrl({
        type: "address",
        value: suiAccount.address,
        network: config.suiNetwork,
      })
    : null;
  const txUrl = lastDigest
    ? buildSuiExplorerUrl({
        type: "tx",
        value: lastDigest,
        network: config.suiNetwork,
      })
    : null;
  const vaultStatusLabel = !vaultContracts
    ? "Testnet only"
    : vaultSettlementActive === null
      ? "Checking"
      : vaultSettlementActive
        ? "Settlement active"
        : "Deposits open";
  const vaultStatusClass =
    !vaultContracts || vaultSettlementActive === true
      ? "bg-[#fff7e6] text-[#9a5f00]"
      : vaultSettlementActive === null
        ? "bg-[#eef3f2] text-[#607873]"
        : "bg-[#e9f5f3] text-[#0e6f66]";

  return (
    <main className="min-h-screen bg-[#f7faf9] text-[#10201f]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-[#dce8e4] bg-white px-6 py-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-[#0e7c72] text-sm font-semibold text-white">
              S
            </div>
            <div>
              <p className="text-sm font-semibold">Turnkey Sui Wallet</p>
              <p className="text-xs text-[#5e7570]">Embedded wallet demo</p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <RailItem
              active={isClientReady}
              icon={<ShieldCheck size={16} />}
              label={isClientReady ? "Turnkey ready" : "Turnkey loading"}
            />
            <RailItem
              active={isAuthenticated}
              icon={<KeyRound size={16} />}
              label={isAuthenticated ? "Signed in" : "Sign in"}
            />
            <RailItem
              active={Boolean(suiAccount)}
              icon={<Wallet size={16} />}
              label={suiAccount ? "Sui wallet" : "Create wallet"}
            />
            <RailItem
              active={Boolean(lastDigest)}
              icon={<Send size={16} />}
              label={lastDigest ? "Transaction sent" : "Test transfer"}
            />
            <RailItem
              active={Boolean(lastVaultDigest)}
              icon={<Vault size={16} />}
              label={lastVaultDigest ? "Vault deposit" : "Vault testnet"}
            />
          </div>

          <div className="mt-8 rounded-lg border border-[#dce8e4] bg-[#f7faf9] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607873]">
              Network
            </p>
            <p className="mt-2 text-sm font-medium">{config.suiNetwork}</p>
            <p className="mt-1 break-all text-xs text-[#607873]">{getSuiRpcUrl(config)}</p>
          </div>
        </aside>

        <section className="px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex flex-col gap-4 border-b border-[#dce8e4] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-[#10201f]">
                Turnkey Sui Wallet
              </h1>
              <p className="mt-1 text-sm text-[#607873]">
                Embedded wallet demo for Sui testnet accounts, transaction signing, and vault deposits.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={logoutUser}
                  disabled={busyAction !== null}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c9d9d4] bg-white px-4 text-sm font-semibold text-[#26403c] transition hover:border-[#0e7c72] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyAction === "logout" ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <LogOut size={16} />
                  )}
                  Sign out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={login}
                  disabled={!isClientReady || busyAction !== null}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0e7c72] px-4 text-sm font-semibold text-white transition hover:bg-[#0b675f] disabled:cursor-not-allowed disabled:bg-[#b7cbc6]"
                >
                  {busyAction === "login" ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <KeyRound size={16} />
                  )}
                  Sign in
                </button>
              )}
            </div>
          </header>

          <div className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
            <div className="space-y-5">
              <section className="grid gap-5 md:grid-cols-2">
                <section className="rounded-lg border border-[#dce8e4] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Wallet size={18} className="text-[#0e7c72]" />
                      Sui wallet
                    </div>
                    <span className="rounded-md bg-[#e9f5f3] px-2 py-1 text-xs font-semibold text-[#0e6f66]">
                      {suiAccount ? "Ready" : "Not created"}
                    </span>
                  </div>

                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
                    Address
                  </p>
                  <p className="mt-2 min-h-10 break-all font-mono text-sm text-[#10201f]">
                    {suiAccount?.address ?? "Sign in to create an ADDRESS_FORMAT_SUI account"}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={createSuiWallet}
                      disabled={!isClientReady || busyAction !== null}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0e7c72] px-3 text-sm font-semibold text-white transition hover:bg-[#0b675f] disabled:cursor-not-allowed disabled:bg-[#b7cbc6]"
                    >
                      {busyAction === "create-wallet" ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Wallet size={16} />
                      )}
                      Create Sui wallet
                    </button>
                    <button
                      type="button"
                      onClick={copyAddress}
                      disabled={!suiAccount}
                      title="Copy address"
                      className="inline-flex size-10 items-center justify-center rounded-lg border border-[#c9d9d4] bg-white text-[#26403c] transition hover:border-[#0e7c72] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Copy size={16} />
                    </button>
                    {addressUrl ? (
                      <a
                        href={addressUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in Sui Explorer"
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-[#c9d9d4] bg-white text-[#26403c] transition hover:border-[#0e7c72]"
                      >
                        <ExternalLink size={16} />
                      </a>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-lg border border-[#dce8e4] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Network size={18} className="text-[#0e7c72]" />
                      Sui testnet
                    </div>
                    <button
                      type="button"
                      onClick={refreshBalance}
                      disabled={!suiAccount || busyAction !== null}
                      title="Refresh balance"
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c9d9d4] bg-white text-[#26403c] transition hover:border-[#0e7c72] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyAction === "refresh" ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </button>
                  </div>

                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
                    Balance
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-normal">
                    {balanceMist === null ? "0" : formatMistToSui(balanceMist)}
                    <span className="ml-2 text-base font-medium text-[#607873]">SUI</span>
                  </p>
                  <p className="mt-4 text-sm text-[#607873]">
                    Fund this address with the Sui faucet before sending a transfer.
                  </p>
                </section>
              </section>

              <section className="rounded-lg border border-[#dce8e4] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Send size={18} className="text-[#0e7c72]" />
                  Sign & send
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
                      Recipient
                    </span>
                    <input
                      value={recipient}
                      onChange={(event) => setRecipient(event.target.value)}
                      className="mt-2 h-11 w-full rounded-lg border border-[#c9d9d4] bg-white px-3 font-mono text-sm outline-none transition focus:border-[#0e7c72] focus:ring-2 focus:ring-[#bde8e2]"
                      placeholder={suiAccount?.address ?? "0x..."}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
                      Amount
                    </span>
                    <input
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="mt-2 h-11 w-full rounded-lg border border-[#c9d9d4] bg-white px-3 text-sm outline-none transition focus:border-[#0e7c72] focus:ring-2 focus:ring-[#bde8e2]"
                      inputMode="decimal"
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={sendTransfer}
                    disabled={!suiAccount || busyAction !== null}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0e7c72] px-4 text-sm font-semibold text-white transition hover:bg-[#0b675f] disabled:cursor-not-allowed disabled:bg-[#b7cbc6]"
                  >
                    {busyAction === "send" ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    Sign & send
                  </button>
                  {txUrl ? (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c9d9d4] bg-white px-3 text-sm font-semibold text-[#26403c] transition hover:border-[#0e7c72]"
                    >
                      <ExternalLink size={16} />
                      View transaction
                    </a>
                  ) : null}
                </div>
              </section>

              <section className="rounded-lg border border-[#dce8e4] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Vault size={18} className="text-[#0e7c72]" />
                    Vault testnet
                  </div>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${vaultStatusClass}`}
                  >
                    {vaultStatusLabel}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-[#dce8e4] bg-[#f7faf9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
                      Package
                    </p>
                    <p className="mt-2 break-all font-mono text-xs text-[#10201f]">
                      {vaultContracts?.PACKAGE_ID ?? "NEXT_PUBLIC_SUI_NETWORK=testnet"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#dce8e4] bg-[#f7faf9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
                      Vault object
                    </p>
                    <p className="mt-2 break-all font-mono text-xs text-[#10201f]">
                      {vaultContracts?.VAULT_OBJECT_ID ?? "Unavailable"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
                        USDC balance
                      </p>
                      <button
                        type="button"
                        onClick={refreshVaultUsdcBalance}
                        disabled={!suiAccount || !vaultContracts || busyAction !== null}
                        title="Refresh USDC balance"
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c9d9d4] bg-white text-[#26403c] transition hover:border-[#0e7c72] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyAction === "refresh-usdc" ? (
                          <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                      </button>
                    </div>
                    <p className="mt-2 text-3xl font-semibold tracking-normal">
                      {usdcBalanceBaseUnits === null
                        ? "0"
                        : formatUsdcBaseUnits(usdcBalanceBaseUnits)}
                      <span className="ml-2 text-base font-medium text-[#607873]">USDC</span>
                    </p>
                  </div>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
                      Deposit
                    </span>
                    <input
                      value={vaultAmount}
                      onChange={(event) => setVaultAmount(event.target.value)}
                      className="mt-2 h-11 w-full rounded-lg border border-[#c9d9d4] bg-white px-3 text-sm outline-none transition focus:border-[#0e7c72] focus:ring-2 focus:ring-[#bde8e2]"
                      inputMode="decimal"
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={depositToVault}
                    disabled={
                      !suiAccount ||
                      !vaultContracts ||
                      vaultSettlementActive !== false ||
                      busyAction !== null
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0e7c72] px-4 text-sm font-semibold text-white transition hover:bg-[#0b675f] disabled:cursor-not-allowed disabled:bg-[#b7cbc6]"
                  >
                    {busyAction === "vault-deposit" ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Coins size={16} />
                    )}
                    Deposit to vault
                  </button>
                  {vaultSettlementActive ? (
                    <span className="text-sm font-medium text-[#9a5f00]">
                      Deposits are blocked during settlement.
                    </span>
                  ) : null}
                  {lastVaultDigest ? (
                    <a
                      href={buildSuiExplorerUrl({
                        type: "tx",
                        value: lastVaultDigest,
                        network: config.suiNetwork,
                      })}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c9d9d4] bg-white px-3 text-sm font-semibold text-[#26403c] transition hover:border-[#0e7c72]"
                    >
                      <ExternalLink size={16} />
                      View vault tx
                    </a>
                  ) : null}
                </div>
              </section>
            </div>

            <aside className="rounded-lg border border-[#dce8e4] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Transaction log</p>
                <CheckCircle2 size={18} className="text-[#0e7c72]" />
              </div>

              <div className="mt-5 space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`border-l-2 pl-3 ${
                      log.tone === "error"
                        ? "border-[#c2410c]"
                        : log.tone === "success"
                          ? "border-[#0e7c72]"
                          : "border-[#819691]"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#10201f]">{log.title}</p>
                    <p className="mt-1 break-all text-sm text-[#607873]">{log.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg border border-[#dce8e4] bg-[#f7faf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
                  Session
                </p>
                <p className="mt-2 text-sm font-medium">
                  {isAuthenticated
                    ? user?.userEmail ?? user?.userName ?? "Authenticated"
                    : "Unauthenticated"}
                </p>
                <p className="mt-1 break-all font-mono text-xs text-[#607873]">
                  {session?.organizationId ?? config.organizationId}
                </p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function RailItem({
  active,
  icon,
  label,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
        active ? "bg-[#e9f5f3] font-semibold text-[#0e6f66]" : "text-[#607873]"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
