import { MissingEnvDemo } from "@/components/missing-env-demo";
import { TurnkeyWalletDemo } from "@/components/turnkey-wallet-demo";
import { publicDemoConfig } from "@/lib/demo-config";

export default function Home() {
  if (!publicDemoConfig.isTurnkeyConfigured) {
    return <MissingEnvDemo config={publicDemoConfig} />;
  }

  return <TurnkeyWalletDemo config={publicDemoConfig} />;
}
