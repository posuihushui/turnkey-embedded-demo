# Turnkey Sui Embedded Wallet Demo

Next.js demo for Turnkey Embedded Wallets with Sui support. It signs in with Turnkey, creates an embedded `ADDRESS_FORMAT_SUI` wallet account, reads Sui testnet balances, constructs Sui transfers and TBook vault deposits, signs Sui transaction digests through Turnkey raw payload signing, and broadcasts through the Sui JSON-RPC API.

## Requirements

- Node.js 22 or newer. This project uses `@mysten/sui@2.x`, which requires Node 22+.
- A Turnkey organization with an Auth Proxy config for Embedded Wallets.
- Sui testnet funds for gas on the generated Sui address.
- Sui testnet USDC for vault deposit testing.

## Setup

Copy `.env.example` to `.env.local` and fill the required values:

```bash
NEXT_PUBLIC_ORGANIZATION_ID=your_turnkey_parent_organization_id
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=your_turnkey_auth_proxy_config_id
NEXT_PUBLIC_SUI_NETWORK=testnet
```

Optional values:

```bash
NEXT_PUBLIC_TURNKEY_API_BASE_URL=https://api.turnkey.com
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
```

Run the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Dependency Notes

`package.json` pins an override for `viem`'s `ws` dependency so the Turnkey wallet stack resolves to `ws@8.21.0`.

As of this setup, `npm audit --omit=dev` still reports a moderate advisory for `next@16.2.9` through Next's bundled `postcss@8.4.31`. The latest stable Next release is still affected; the available clean versions are canary builds, so this demo stays on stable Next.

## Sui Notes

The demo creates this Turnkey wallet account by default:

```ts
{
  curve: "CURVE_ED25519",
  pathFormat: "PATH_FORMAT_BIP32",
  path: "m/44'/784'/0'/0'/0'",
  addressFormat: "ADDRESS_FORMAT_SUI",
}
```

Sui signing follows Turnkey's current Sui guidance: build transaction bytes with the Sui SDK, hash `messageWithIntent("TransactionData", txBytes)` with Blake2b-256, call Turnkey `signRawPayload` with `HASH_FUNCTION_NOT_APPLICABLE`, then serialize `r + s + publicKey` as an Ed25519 Sui signature.

## Vault Testnet Notes

The vault testnet integration is based on `/Users/lake/work/tbook/tbook-vault-fe` and uses the testnet contracts in `src/lib/vault-contracts.ts`. The deposit flow calls:

```ts
0xcf7293eba9307057793d0685e4c573b12a2c2928ab60028f1d8766f1d4879c1c::vault_api::deposit
```

Set `NEXT_PUBLIC_SUI_NETWORK=testnet`, fund the embedded Sui address with gas and testnet USDC, then use the Vault testnet panel to refresh USDC and submit a deposit.
