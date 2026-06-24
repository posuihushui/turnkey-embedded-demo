"use client";

import {
  TurnkeyProvider,
  type TurnkeyProviderConfig,
} from "@turnkey/react-wallet-kit";
import type { DemoConfig } from "@/lib/demo-config";
import { SUI_WALLET_ACCOUNT_PARAMS } from "@/lib/sui-demo";

const suiSuborgWallet = {
  customWallet: {
    walletName: "Turnkey Sui Demo",
    walletAccounts: [SUI_WALLET_ACCOUNT_PARAMS],
  },
};

export function Providers({
  children,
  config,
}: {
  children: React.ReactNode;
  config: DemoConfig;
}) {
  if (!config.isTurnkeyConfigured) {
    return children;
  }

  const turnkeyConfig: TurnkeyProviderConfig = {
    organizationId: config.organizationId!,
    authProxyConfigId: config.authProxyConfigId!,
    apiBaseUrl: config.turnkeyApiBaseUrl,
    auth: {
      autoRefreshSession: true,
      createSuborgParams: {
        emailOtpAuth: suiSuborgWallet,
        passkeyAuth: {
          ...suiSuborgWallet,
          passkeyName: "Turnkey Sui Demo",
        },
        oauth: suiSuborgWallet,
        walletAuth: suiSuborgWallet,
      },
    },
    autoRefreshManagedState: true,
    ui: {
      borderRadius: 8,
      darkMode: false,
      authModal: {
        methods: {
          emailOtpAuthEnabled: true,
          passkeyAuthEnabled: true,
          walletAuthEnabled: false,
        },
        methodOrder: ["email", "passkey", "socials"],
      },
    },
  };

  return (
    <TurnkeyProvider
      config={turnkeyConfig}
      callbacks={{
        onError: (error) => {
          console.error("Turnkey error:", error);
        },
      }}
    >
      {children}
    </TurnkeyProvider>
  );
}
