import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Network,
  Send,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { DemoConfig } from "@/lib/demo-config";
import { getMissingTurnkeyEnvKeys } from "@/lib/demo-config";
import { SUI_WALLET_ACCOUNT_PARAMS } from "@/lib/sui-demo";
import { getSuiRpcUrl } from "@/lib/sui-service";

export function MissingEnvDemo({ config }: { config: DemoConfig }) {
  const missingKeys = getMissingTurnkeyEnvKeys(config);

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
            <SetupItem active icon={<AlertTriangle size={16} />} label="Needs env" />
            <SetupItem icon={<ShieldCheck size={16} />} label="Turnkey auth" />
            <SetupItem icon={<Wallet size={16} />} label="Sui wallet" />
            <SetupItem icon={<Send size={16} />} label="Testnet transfer" />
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
                Embedded wallet demo for Sui testnet accounts and transaction signing.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#c9d9d4] px-4 text-sm font-semibold text-white"
            >
              <KeyRound size={16} />
              Sign in
            </button>
          </header>

          <div className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
            <div className="space-y-5">
              <section className="rounded-lg border border-[#dce8e4] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#10201f]">Developer setup</p>
                    <p className="mt-1 text-sm text-[#607873]">
                      Add the missing public Turnkey values, then restart the dev server.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-md bg-[#fff7e6] px-3 py-1 text-xs font-semibold text-[#9a5f00]">
                    <AlertTriangle size={14} />
                    Needs env
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {missingKeys.map((key) => (
                    <div key={key} className="rounded-lg border border-[#ead9b8] bg-[#fffaf0] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9a5f00]">
                        Missing
                      </p>
                      <p className="mt-2 break-all font-mono text-sm text-[#3a2c10]">{key}</p>
                    </div>
                  ))}
                  <div className="rounded-lg border border-[#dce8e4] bg-[#f7faf9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
                      Sui account
                    </p>
                    <p className="mt-2 font-mono text-sm text-[#10201f]">
                      {SUI_WALLET_ACCOUNT_PARAMS.addressFormat}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#dce8e4] bg-[#f7faf9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
                      Path
                    </p>
                    <p className="mt-2 font-mono text-sm text-[#10201f]">
                      {SUI_WALLET_ACCOUNT_PARAMS.path}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-5 md:grid-cols-2">
                <Panel
                  icon={<Wallet size={18} />}
                  title="Sui wallet"
                  label="Address"
                  value="Connect Turnkey first"
                />
                <Panel
                  icon={<Network size={18} />}
                  title="Sui testnet"
                  label="Balance"
                  value="Waiting for wallet"
                />
              </section>
            </div>

            <aside className="rounded-lg border border-[#dce8e4] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Transaction log</p>
                <CheckCircle2 size={18} className="text-[#0e7c72]" />
              </div>
              <div className="mt-5 space-y-4">
                <LogRow title="Ready" detail="Next.js app is running." />
                <LogRow title="Needs env" detail="Turnkey provider is disabled until env is set." />
                <LogRow title="Sui testnet" detail="RPC URL is already selected." />
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function SetupItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
        active
          ? "bg-[#e9f5f3] font-semibold text-[#0e6f66]"
          : "text-[#607873]"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

function Panel({
  icon,
  title,
  label,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  label: string;
  value: string;
}) {
  return (
    <section className="rounded-lg border border-[#dce8e4] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-[#0e7c72]">{icon}</span>
        {title}
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#607873]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[#10201f]">{value}</p>
    </section>
  );
}

function LogRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-l-2 border-[#0e7c72] pl-3">
      <p className="text-sm font-semibold text-[#10201f]">{title}</p>
      <p className="mt-1 text-sm text-[#607873]">{detail}</p>
    </div>
  );
}
